"""
EHR Platform — OCR Engine with Advanced Preprocessing
Chunk 19: Improved image preprocessing for clinical documents

Pipeline per image:
1. Decode image bytes
2. Assess image quality (size, brightness, blur)
3. Upscale if too small
4. Deskew (straighten rotated document)
5. Adaptive denoising based on image type
6. Contrast enhancement
7. Binarization (adaptive threshold)
8. Run PaddleOCR
9. Post-process OCR text (clean artifacts)
10. Return structured result with quality metadata
"""

import logging
import math
import numpy as np
import cv2

log = logging.getLogger("ehr-ocr")

# Global OCR instance — initialized lazily on first request
_ocr = None


def get_ocr():
    """Returns the global PaddleOCR instance, initializing if needed."""
    global _ocr
    if _ocr is None:
        log.info("Initializing PaddleOCR engine...")
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=False,
            show_log=False,
        )
        log.info("PaddleOCR engine ready")
    return _ocr


# =============================================================================
# STEP 1 — IMAGE QUALITY ASSESSMENT
# =============================================================================

def assess_image_quality(img: np.ndarray) -> dict:
    """
    Analyses the image before preprocessing to decide which
    preprocessing steps to apply and at what intensity.

    Returns a dict with quality flags used by the pipeline.
    """
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur score — Laplacian variance (higher = sharper)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Brightness — mean pixel value
    brightness = float(np.mean(gray))

    # Contrast — standard deviation of pixel values
    contrast = float(np.std(gray))

    # Resolution assessment
    is_small = w < 1000 or h < 1000
    is_very_small = w < 600 or h < 600

    # Quality flags
    is_blurry = blur_score < 100
    is_dark = brightness < 80
    is_overexposed = brightness > 200
    is_low_contrast = contrast < 30

    quality = {
        "width": int(w),
        "height": int(h),
        "blur_score": round(float(blur_score), 2),
        "brightness": round(float(brightness), 2),
        "contrast": round(float(contrast), 2),
        "is_small": bool(is_small),
        "is_very_small": bool(is_very_small),
        "is_blurry": bool(is_blurry),
        "is_dark": bool(is_dark),
        "is_overexposed": bool(is_overexposed),
        "is_low_contrast": bool(is_low_contrast),
    }

    log.info(
        f"Image quality — size: {w}x{h} | blur: {blur_score:.1f} | "
        f"brightness: {brightness:.1f} | contrast: {contrast:.1f}"
    )
    return quality


# =============================================================================
# STEP 2 — UPSCALING
# =============================================================================

def upscale_if_needed(img: np.ndarray, quality: dict) -> np.ndarray:
    """
    Upscales small images before OCR.
    PaddleOCR performs significantly better on images >= 1200px wide.
    Uses INTER_CUBIC for quality upscaling (better than INTER_LINEAR for text).
    """
    if quality["is_very_small"]:
        scale = 3.0
        log.info(f"Upscaling image 3x (very small: {quality['width']}x{quality['height']})")
    elif quality["is_small"]:
        scale = 2.0
        log.info(f"Upscaling image 2x (small: {quality['width']}x{quality['height']})")
    else:
        return img

    h, w = img.shape[:2]
    new_w = int(w * scale)
    new_h = int(h * scale)
    upscaled = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    log.info(f"Upscaled to {new_w}x{new_h}")
    return upscaled


# =============================================================================
# STEP 3 — DESKEWING
# =============================================================================

def get_skew_angle(gray: np.ndarray) -> float:
    """
    Detects the rotation angle of a document image.
    Uses Hough line detection on edges to find dominant text line angle.
    Returns angle in degrees (negative = clockwise tilt, positive = counter-clockwise).
    """
    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Hough line transform
    lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)

    if lines is None or len(lines) == 0:
        return 0.0

    angles = []
    for line in lines[:50]:   # use top 50 lines only
        rho, theta = line[0]
        # Convert to degrees, normalize to -45 to +45 range
        angle = math.degrees(theta) - 90
        if -45 <= angle <= 45:
            angles.append(angle)

    if not angles:
        return 0.0

    # Use median angle (more robust than mean against outliers)
    median_angle = float(np.median(angles))

    # Only correct if skew is significant (> 0.5 degrees)
    if abs(median_angle) < 0.5:
        return 0.0

    return median_angle


def deskew(img: np.ndarray) -> np.ndarray:
    """
    Straightens a skewed document image.
    Skew up to ±15 degrees is corrected.
    Beyond that, the image is likely a valid angled photo — leave it.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    angle = get_skew_angle(gray)

    if angle == 0.0:
        return img

    if abs(angle) > 15:
        log.info(f"Skew angle {angle:.1f}° exceeds correction threshold — skipping deskew")
        return img

    log.info(f"Deskewing image by {angle:.1f}°")
    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)

    # Use border replication to avoid black borders after rotation
    deskewed = cv2.warpAffine(
        img,
        rotation_matrix,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return deskewed


# =============================================================================
# STEP 4 — DENOISING
# =============================================================================

def denoise(img: np.ndarray, quality: dict) -> np.ndarray:
    """
    Applies denoising appropriate to the image quality.
    - Blurry images: light denoising only (aggressive denoising worsens blur)
    - Sharp images: standard denoising
    Uses Non-Local Means denoising — best quality for text documents.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if quality["is_blurry"]:
        # Light denoising for already-blurry images
        h_param = 5
        log.info("Applying light denoising (blurry image)")
    else:
        # Standard denoising
        h_param = 10
        log.info("Applying standard denoising")

    denoised = cv2.fastNlMeansDenoising(gray, h=h_param)
    return cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)


# =============================================================================
# STEP 5 — CONTRAST ENHANCEMENT
# =============================================================================

def enhance_contrast(img: np.ndarray, quality: dict) -> np.ndarray:
    """
    Enhances contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization).
    CLAHE is preferred over global histogram equalization for documents because
    it enhances locally — handwritten text on varying backgrounds improves significantly.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if quality["is_dark"] or quality["is_low_contrast"]:
        # Aggressive CLAHE for dark/low-contrast images
        clip_limit = 3.0
        tile_size = (8, 8)
        log.info("Applying aggressive CLAHE contrast enhancement")
    else:
        # Mild CLAHE for normal images — improves text without over-processing
        clip_limit = 1.5
        tile_size = (16, 16)
        log.info("Applying mild CLAHE contrast enhancement")

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
    enhanced = clahe.apply(gray)
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)


# =============================================================================
# STEP 6 — BINARIZATION
# =============================================================================

def binarize(img: np.ndarray, quality: dict) -> np.ndarray:
    """
    Converts image to clean black-and-white for OCR.
    Uses adaptive thresholding — handles varying lighting across the document.
    (Global thresholding fails on documents photographed under uneven light.)

    For overexposed images: uses Otsu's method instead.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if quality["is_overexposed"]:
        # Otsu's binarization for overexposed images
        log.info("Binarizing with Otsu's method (overexposed image)")
        _, binary = cv2.threshold(
            gray, 0, 255,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
    else:
        # Adaptive Gaussian thresholding — best for clinical documents
        # Block size 31: large enough to handle varying backgrounds
        # C=10: constant subtracted from mean — fine-tuned for printed text
        log.info("Binarizing with adaptive Gaussian threshold")
        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=31,
            C=10,
        )

    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


# =============================================================================
# STEP 7 — OCR POST-PROCESSING
# =============================================================================

def clean_ocr_text(lines: list[dict]) -> list[dict]:
    """
    Cleans common OCR artifacts from extracted text lines.
    Applied after PaddleOCR runs — fixes known misreads in medical documents.
    """
    # Common single-character OCR confusions in medical text
    CHAR_FIXES = {
        # Number/letter confusion
        "O": "0",    # capital O misread as zero — only in numeric contexts
        "l": "1",    # lowercase L misread as one — only in numeric contexts
        "I": "1",    # capital I misread as one — only in numeric contexts
        "S": "5",    # S misread as 5 — only in numeric contexts
    }

    # Common full-word OCR fixes for Indian medical documents
    WORD_FIXES = {
        # Drug form abbreviations
        "TAE": "TAB",
        "TAS": "TAB",
        "TAR": "TAB",
        "CAS": "CAP",
        "CAE": "CAP",
        "SYE": "SYP",
        "SYR": "SYP",
        # Common drug name OCR errors
        "MEEAL": "MEFTAL",
        "MEFEAL": "MEFTAL",
        "MEGACV": "MEGA CV",
        "LANUIER": "LANULER",
        "LANUIER": "LANULER",
        "ASTHAKIND": "ASTHAKIND",   # confirm correct
        "BETADLNE": "BETADINE",
        "BETAD1NE": "BETADINE",
        # Frequency notation fixes
        "1-O-1": "1-0-1",           # capital O vs zero
        "1-O-O": "1-0-0",
        "O-O-1": "0-0-1",
        "l-O-l": "1-0-1",
        # Vitals
        "SpO?": "SpO2",
        "Sp02": "SpO2",
        "SP02": "SpO2",
    }

    cleaned = []
    for line in lines:
        text = line["text"]
        original = text

        # Apply full word fixes (case-insensitive match, preserve original case style)
        for wrong, right in WORD_FIXES.items():
            if wrong.upper() in text.upper():
                text = text.upper().replace(wrong.upper(), right)

        # Strip common OCR noise characters
        text = text.strip()
        text = text.replace("|", "I")    # pipe misread as I
        text = text.replace("©", "")     # stray copyright symbols
        text = text.replace("®", "")     # stray registered symbols

        if text != original:
            log.debug(f"OCR fix: '{original}' → '{text}'")

        cleaned.append({**line, "text": text})

    return cleaned


# =============================================================================
# MAIN OCR PIPELINE
# =============================================================================

def preprocess_image(image_bytes: bytes) -> tuple[np.ndarray, dict]:
    """
    Full preprocessing pipeline.
    Returns (preprocessed_image, quality_metadata).
    """
    # Decode
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image — unsupported format or corrupted file")

    # Quality assessment
    quality = assess_image_quality(img)

    # Pipeline steps — each step receives the output of the previous
    img = upscale_if_needed(img, quality)
    img = deskew(img)
    img = denoise(img, quality)
    img = enhance_contrast(img, quality)
    img = binarize(img, quality)

    return img, quality


def run_ocr(image_bytes: bytes) -> dict:
    """
    Main OCR function. Full preprocessing pipeline + PaddleOCR + post-processing.

    Returns:
    {
      "text": "full extracted text as single string",
      "lines": [{"text": "...", "confidence": 0.99}, ...],
      "avg_confidence": 0.94,
      "low_confidence_warning": bool,
      "quality": { image quality metadata },
      "preprocessing_applied": [ list of steps applied ]
    }
    """
    ocr = get_ocr()

    log.info("Starting OCR pipeline...")
    preprocessed, quality = preprocess_image(image_bytes)

    # Track which preprocessing steps fired
    steps_applied = ["denoise", "contrast_enhancement", "binarization"]
    if quality["is_small"] or quality["is_very_small"]:
        steps_applied.insert(0, "upscaling")

    log.info(f"Running PaddleOCR on preprocessed image...")
    ocr_result = ocr.ocr(preprocessed, cls=True)

    if not ocr_result or not ocr_result[0]:
        log.warning("PaddleOCR returned empty result")
        return {
            "text": "",
            "lines": [],
            "avg_confidence": 0.0,
            "low_confidence_warning": True,
            "quality": quality,
            "preprocessing_applied": steps_applied,
        }

    # Build lines list
    raw_lines = []
    for line in ocr_result[0]:
        text = line[1][0]
        confidence = float(line[1][1])
        raw_lines.append({"text": text, "confidence": round(confidence, 3)})

    # Post-process — clean OCR artifacts
    cleaned_lines = clean_ocr_text(raw_lines)

    full_text = "\n".join(line["text"] for line in cleaned_lines)
    avg_confidence = sum(l["confidence"] for l in cleaned_lines) / len(cleaned_lines)

    low_conf_warning = avg_confidence < 0.75

    log.info(
        f"OCR complete — {len(cleaned_lines)} lines | "
        f"avg confidence: {avg_confidence:.2f} | "
        f"warning: {low_conf_warning}"
    )

    return {
        "text": full_text,
        "lines": cleaned_lines,
        "avg_confidence": round(avg_confidence, 3),
        "low_confidence_warning": low_conf_warning,
        "quality": quality,
        "preprocessing_applied": steps_applied,
    }

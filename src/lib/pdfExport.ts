import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfExportOptions {
  title: string
  subtitle?: string
  hospitalName?: string
  filename?: string
  columns: { header: string; dataKey: string }[]
  data: Record<string, any>[]
}

export function exportTableToPdf({
  title,
  subtitle,
  hospitalName,
  filename = 'export.pdf',
  columns,
  data,
}: PdfExportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const primaryColor: [number, number, number] = [30, 41, 59] // Slate 800
  const accentColor: [number, number, number] = [14, 116, 144] // Cyan/Teal 700
  const headerBgColor: [number, number, number] = [241, 245, 249] // Slate 100
  const textColor: [number, number, number] = [51, 65, 85]

  // Top Brand Header bar
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 42, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('My Aarogyam EHR Platform', 40, 26)

  if (hospitalName) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(hospitalName, doc.internal.pageSize.getWidth() - 40, 26, { align: 'right' })
  }

  // Document Title & Metadata
  let currentY = 70
  doc.setTextColor(...primaryColor)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 40, currentY)

  currentY += 16
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const metaParts: string[] = []
  if (subtitle) metaParts.push(subtitle)
  metaParts.push(`Generated: ${new Date().toLocaleString()}`)
  metaParts.push(`Total Records: ${data.length}`)
  doc.text(metaParts.join('  •  '), 40, currentY)

  currentY += 14

  // Table
  const tableRows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.dataKey]
      if (val === undefined || val === null || val === '') return '—'
      return String(val)
    })
  )

  const headers = [columns.map((c) => c.header)]

  autoTable(doc, {
    startY: currentY,
    head: headers,
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: textColor,
      cellPadding: 6,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: headerBgColor,
      textColor: primaryColor,
      fontStyle: 'bold',
      lineWidth: 0.5,
      lineColor: [226, 232, 240],
    },
    bodyStyles: {
      lineWidth: 0.5,
      lineColor: [241, 245, 249],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40, top: 40, bottom: 45 },
    didDrawPage: (hookData) => {
      // Footer page numbering
      const pageNumber = hookData.pageNumber
      const totalPages = (doc as any).internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        doc.internal.pageSize.getWidth() - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      )
      doc.text(
        'Confidential & Proprietary — Healthcare Record Document',
        40,
        doc.internal.pageSize.getHeight() - 20
      )
    },
  })

  doc.save(filename)
}

export interface DevExportMultiData {
  hospitals: Record<string, any>[]
  patients: Record<string, any>[]
  providers: Record<string, any>[]
  staff: Record<string, any>[]
}

export function exportAllSystemDataToPdf(allData: DevExportMultiData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const primaryColor: [number, number, number] = [15, 23, 42] // Slate 900
  const headerBgColor: [number, number, number] = [241, 245, 249]
  const textColor: [number, number, number] = [51, 65, 85]

  const drawHeaderBar = (titleStr: string) => {
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 42, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('My Aarogyam EHR Platform — Master System Backup', 40, 26)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(titleStr, doc.internal.pageSize.getWidth() - 40, 26, { align: 'right' })
  }

  // Cover / Header on first page
  drawHeaderBar('Comprehensive Data Export')

  let currentY = 70
  doc.setTextColor(...primaryColor)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Complete Multi-Tenant System Database Export', 40, currentY)

  currentY += 18
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Exported on: ${new Date().toLocaleString()}  •  Dev Console Full Backup`,
    40,
    currentY
  )

  currentY += 15

  // Summary box
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(40, currentY, doc.internal.pageSize.getWidth() - 80, 48, 6, 6, 'FD')

  doc.setTextColor(...primaryColor)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Dataset Summary', 52, currentY + 18)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(
    `Hospitals: ${allData.hospitals.length}   |   Patients: ${allData.patients.length}   |   Providers: ${allData.providers.length}   |   Staff Members: ${allData.staff.length}`,
    52,
    currentY + 34
  )

  currentY += 68

  const sections: {
    title: string
    columns: { header: string; dataKey: string }[]
    data: Record<string, any>[]
  }[] = [
    {
      title: '1. Registered Hospital Tenants',
      columns: [
        { header: 'Hospital ID', dataKey: 'id' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Code', dataKey: 'code' },
        { header: 'Staff', dataKey: 'staffCount' },
        { header: 'Patients', dataKey: 'patientCount' },
      ],
      data: allData.hospitals,
    },
    {
      title: '2. Registered Medical Providers',
      columns: [
        { header: 'Name', dataKey: 'name' },
        { header: 'Specialty', dataKey: 'specialty' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Hospital', dataKey: 'hospitalName' },
      ],
      data: allData.providers,
    },
    {
      title: '3. Clinical Staff Members',
      columns: [
        { header: 'Name', dataKey: 'displayName' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Role', dataKey: 'role' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Hospital', dataKey: 'hospitalName' },
      ],
      data: allData.staff,
    },
    {
      title: '4. Patient Directory',
      columns: [
        { header: 'Patient Name', dataKey: 'name' },
        { header: 'Gender', dataKey: 'gender' },
        { header: 'Age', dataKey: 'age' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Type', dataKey: 'patientType' },
        { header: 'Doctor', dataKey: 'doctorName' },
        { header: 'Hospital', dataKey: 'hospitalName' },
      ],
      data: allData.patients,
    },
  ]

  sections.forEach((sec, idx) => {
    if (idx > 0) {
      doc.addPage()
      drawHeaderBar(sec.title)
      currentY = 60
    }

    doc.setTextColor(...primaryColor)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(sec.title, 40, currentY)
    currentY += 12

    const rows = sec.data.map((row) =>
      sec.columns.map((c) => {
        const val = row[c.dataKey]
        if (val === undefined || val === null || val === '') return '—'
        return String(val)
      })
    )

    autoTable(doc, {
      startY: currentY,
      head: [sec.columns.map((c) => c.header)],
      body: rows.length > 0 ? rows : [['No records available', '', '', '', '']],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: textColor,
        cellPadding: 5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: headerBgColor,
        textColor: primaryColor,
        fontStyle: 'bold',
        lineWidth: 0.5,
        lineColor: [226, 232, 240],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 40, right: 40, top: 50, bottom: 45 },
      didDrawPage: (hookData) => {
        const pageNumber = hookData.pageNumber
        const totalPages = (doc as any).internal.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `Page ${pageNumber} of ${totalPages}`,
          doc.internal.pageSize.getWidth() - 40,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'right' }
        )
        doc.text(
          'Master Database System Export — For Authorized Developer Use Only',
          40,
          doc.internal.pageSize.getHeight() - 20
        )
      },
    })

    currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 30 : currentY + 100
  })

  doc.save(`system-master-backup-${new Date().toISOString().split('T')[0]}.pdf`)
}

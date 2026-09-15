import React from "react"

interface ComingSoonProps {
  label: string
}

export function ComingSoon({ label }: ComingSoonProps) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500 max-w-md w-full bg-slate-50/50">
        <p className="text-base font-medium">{label}</p>
      </div>
    </div>
  )
}

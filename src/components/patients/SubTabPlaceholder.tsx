import { Clock } from 'lucide-react'

interface Props {
  label: string
  chunk: number
}

export function SubTabPlaceholder({ label, chunk }: Props) {
  return (
    <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 px-4 text-center'>
      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted-foreground mb-3'>
        <Clock className='h-6 w-6' />
      </div>
      <p className='text-sm font-medium text-foreground'>{label} coming in Chunk {chunk}</p>
      <p className='text-xs text-muted-foreground mt-1'>
        This clinical section will be fully integrated with Firebase data in the upcoming milestone.
      </p>
    </div>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { ClassCard, type ClaseHoyCompleta } from "@/components/admin/ClassCard"

export function ClassesToday({ clases }: { clases: ClaseHoyCompleta[] }) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col py-4">
        <h2 className="font-semibold text-text">Clases de hoy</h2>
        {clases.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No hay clases programadas para hoy.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {clases.map((clase) => (
              <ClassCard key={clase.id} clase={clase} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export interface Expense {
  id: string
  concepto: string
  monto: number
  fecha: string
  categoria: string | null
  notas: string | null
}

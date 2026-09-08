/**
 * Abstracción sobre "agregar el carnet a un wallet móvil".
 *
 * Google Wallet ya tiene una integración real (ver lib/wallet.ts, que
 * llama a la Edge Function "wallet-pass"). Apple Wallet todavía NO:
 * instalar un pase real (.pkpass) exige firmarlo con un certificado de
 * Apple Developer Program (cuenta de pago) que este proyecto no tiene
 * hoy, así que por ahora esta función solo simula la experiencia visual
 * — no genera ningún archivo, no llama a ninguna API de Apple, no
 * intenta abrir la app Wallet.
 *
 * Cuando exista esa integración real, el reemplazo es acotado: cambiar
 * el cuerpo de agregarAppleWalletDemo (o agregar una función nueva
 * agregarAppleWallet) para llamar a una Edge Function que devuelva un
 * .pkpass firmado, sin tocar el componente que la consume — por eso
 * vive en un servicio aparte y no dentro del modal.
 */

export interface ResultadoAppleWalletDemo {
  ok: true
  demo: true
}

export async function agregarAppleWalletDemo(): Promise<ResultadoAppleWalletDemo> {
  // Simula la latencia de una llamada real para que la experiencia se
  // sienta creíble, sin prometer nada que no se vaya a cumplir.
  await new Promise((resolve) => setTimeout(resolve, 900))
  return { ok: true, demo: true }
}

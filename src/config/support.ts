const SUPPORT_MESSAGE = 'Olá! Preciso de ajuda com o AcheiHora.'

const supportWhatsapp = import.meta.env.VITE_SUPPORT_WHATSAPP?.trim()

export const supportWhatsappUrl =
  supportWhatsapp && /^55\d{11}$/.test(supportWhatsapp)
    ? `https://wa.me/${supportWhatsapp}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`
    : null

// src/utils/stringUtils.ts

export const normalizeText = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD") // Separa las letras de sus tildes
    .replace(/[\u0300-\u036f]/g, "") // Borra las tildes por completo
    .trim(); // Quita espacios accidentales al inicio y al final
};
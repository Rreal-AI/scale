/**
 * Normaliza un texto para comparaciones robustas
 * - Convierte a minúsculas
 * - Elimina acentos y diacríticos
 * - Elimina espacios extra al inicio y final
 * - Reemplaza múltiples espacios con uno solo
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, "") // Elimina los diacríticos
    .trim()
    .replace(/\s+/g, " "); // Reemplaza múltiples espacios con uno solo
}

/**
 * Compara dos textos de forma normalizada
 * Útil para hacer matching sin preocuparse por acentos o mayúsculas
 */
export function normalizedEquals(text1: string, text2: string): boolean {
  return normalizeText(text1) === normalizeText(text2);
}

/**
 * Busca si un texto normalizado está incluido en otro
 * Útil para búsquedas parciales
 */
export function normalizedIncludes(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}

/**
 * Encuentra un elemento en un array basándose en una propiedad normalizada
 */
export function findByNormalizedProperty<T>(
  array: T[],
  property: keyof T,
  searchValue: string
): T | undefined {
  return array.find((item) => {
    const itemValue = item[property];
    if (typeof itemValue === "string") {
      return normalizedEquals(itemValue, searchValue);
    }
    return false;
  });
}

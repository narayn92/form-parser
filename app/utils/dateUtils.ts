export const convertToddMMyyyy = (dateString: string): string => {
  if (!dateString) return '';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString) || /^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    return dateString.replace(/-/g, '/');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return dateString;
};

export const convertToYyyyMmDd = (dateString: string): string => {
  if (!dateString) return '';

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateString)) {
    const parts = dateString.split(/[/-]/);
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  return dateString;
};

export default { convertToddMMyyyy, convertToYyyyMmDd };

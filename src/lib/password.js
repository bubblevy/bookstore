export function getPasswordRules(value = '') {
  const password = String(value)
  return [
    { key: 'length', label: 'Minimal 8 karakter', ok: password.length >= 8 },
    {
      key: 'case',
      label: 'Huruf besar dan kecil',
      ok: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { key: 'number', label: 'Mengandung angka', ok: /\d/.test(password) },
    { key: 'symbol', label: 'Mengandung simbol', ok: /[^A-Za-z0-9]/.test(password) },
  ]
}

export function getPasswordStrength(value = '') {
  const password = String(value)
  const rules = getPasswordRules(password)
  const score = rules.filter((rule) => rule.ok).length
  const labels = ['Belum diisi', 'Lemah', 'Cukup', 'Hampir kuat', 'Kuat']
  const colors = ['bg-gray-300', 'bg-red-500', 'bg-yellow-400', 'bg-orange-500', 'bg-green-600']
  const index = password ? Math.max(1, score) : 0

  return {
    rules,
    score,
    label: labels[index],
    color: colors[index],
    percent: score * 25,
  }
}

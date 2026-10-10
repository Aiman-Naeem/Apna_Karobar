// One place for every backend call. Matches API_CONTRACT.md.
export const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

export const getToken = () => localStorage.getItem('token')
export const setToken = (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'))

// Images are NOT in the JSON — point <img src> straight at these (404 => show placeholder)
export const imageUrl = {
  storefrontCover: (id) => `${BASE_URL}/storefronts/${id}/cover-image`,
  product: (id) => `${BASE_URL}/products/${id}/image`,
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload
  if (form) {
    payload = form // FormData: browser sets the multipart boundary itself
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the API at ${BASE_URL}. Make sure the backend is running and the API URL is correct.`,
        { cause: error }
      )
    }
    throw error
  }
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // 401 => token missing/expired: tell the app to log out
    if (res.status === 401) window.dispatchEvent(new Event('auth:logout'))
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  // Auth
  sendOtp: (phone) => request('/auth/send-otp', { method: 'POST', body: { phone } }),
  verifyOtp: (phone, otp, name) =>
    request('/auth/verify-otp', { method: 'POST', body: { phone, otp, ...(name ? { name } : {}) } }),
  me: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/update-profile', { method: 'PUT', body: data }),
  // More endpoints get added here screen by screen (storefronts, products, orders, kameti, chatbot)
}

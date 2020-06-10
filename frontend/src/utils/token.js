const ULTIMA_TOKEN_KEY = 'ultimaToken'

export const getToken = () => localStorage.getItem(ULTIMA_TOKEN_KEY)
export const setToken = (token) => window.localStorage.setItem(ULTIMA_TOKEN_KEY, token)
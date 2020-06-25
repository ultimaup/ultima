import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client'
import { setContext } from "@apollo/link-context"
import { getToken } from './utils/token'

let csUrl

try {
  const cs = document.currentScript.getAttribute('src')
  csUrl = new URL(cs)
} catch (e) {
  //
}

const baseUrl = csUrl ? csUrl.protocol + '//' + csUrl.host : ''

const extensionFetch = () => {
  const { extensionId } = document.getElementById('ultima-github-embed').dataset
  return (...opts) => new Promise((resolve, reject) => {
    delete opts[1].signal
    window.chrome.runtime.sendMessage(extensionId, opts, ({ text, ...rest }) => {
      resolve({
        ...rest,
        text: async () => text,
      })
    })
  })
}

const httpLink = createHttpLink({
  uri: baseUrl + '/graphql',
  fetch: !baseUrl ? fetch : extensionFetch(),
})

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = getToken();
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
})

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
})
export default client
import { gql, useQuery } from '@apollo/client'

const GET_TEMPLATES = gql`
    query getTemplates {
      getTemplates {
          id
          name
          template
        }
      }
`

const useTemplates = () => {
    const { loading, error, data } = useQuery(GET_TEMPLATES)

    return {
        loading,
        error,
        templates: data && data.getTemplates,
    }
}

export default useTemplates
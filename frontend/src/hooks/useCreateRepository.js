import { gql, useMutation } from '@apollo/client'

const CREATE_REPOSITORY = gql`
    mutation createRepo($name: String, $private: Boolean, $templateId: ID) {
        createRepo(name: $name, private: $private, templateId: $templateId) {
            id
            name
            full_name
        }
    }
`
const useCreateRepository = () => {
    const [mutate, { loading }] = useMutation(CREATE_REPOSITORY)

    return {
        loading,
        createRepository: variables => mutate({ variables }).then(({ data }) => data.createRepo),
    }
}

export default useCreateRepository
import useGetMinioToken from '../../hooks/useGetMinioToken'
import {useParams} from 'react-router-dom'

const DevBucketRedirect = () => {
    const { bucketName } = useParams()
    const { getMinioToken } = useGetMinioToken()

    getMinioToken(bucketName).then(({ token }) => {
        window.localStorage.setItem('token', token)
        window.location.href = `/minio/${bucketName}`
    })

    return 'Redirecting...'
}

export default DevBucketRedirect
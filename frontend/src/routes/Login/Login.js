import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const LoginButton = (props) => (
    <svg width="260" height="40" viewBox="0 0 260 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect width="260" height="40" rx="5" fill="white"/>
        <path d="M71.0379 18.1293C70.6899 15.9517 68.9846 14.679 66.8319 14.679C64.197 14.679 62.2531 16.6527 62.2531 19.9091C62.2531 23.1655 64.187 25.1392 66.8319 25.1392C69.0692 25.1392 70.7048 23.7372 71.0379 21.7237L69.4868 21.7188C69.2233 23.0213 68.1295 23.7372 66.8419 23.7372C65.0968 23.7372 63.7794 22.3999 63.7794 19.9091C63.7794 17.4382 65.0919 16.081 66.8468 16.081C68.1444 16.081 69.2332 16.8118 69.4868 18.1293H71.0379ZM75.4834 25.1541C77.6361 25.1541 79.0431 23.5781 79.0431 21.2166C79.0431 18.8402 77.6361 17.2642 75.4834 17.2642C73.3307 17.2642 71.9238 18.8402 71.9238 21.2166C71.9238 23.5781 73.3307 25.1541 75.4834 25.1541ZM75.4884 23.9062C74.0815 23.9062 73.4252 22.6783 73.4252 21.2116C73.4252 19.75 74.0815 18.5071 75.4884 18.5071C76.8854 18.5071 77.5417 19.75 77.5417 21.2116C77.5417 22.6783 76.8854 23.9062 75.4884 23.9062ZM81.6989 20.4659C81.6989 19.2479 82.4446 18.5518 83.4787 18.5518C84.4879 18.5518 85.0994 19.2131 85.0994 20.3217V25H86.586V20.1428C86.586 18.2536 85.5469 17.2642 83.9858 17.2642C82.8374 17.2642 82.0867 17.7962 81.7337 18.6065H81.6392V17.3636H80.2124V25H81.6989V20.4659ZM91.6542 17.3636H90.0881V15.5341H88.6016V17.3636H87.483V18.5568H88.6016V23.0661C88.5967 24.4531 89.6556 25.1243 90.8289 25.0994C91.3012 25.0945 91.6194 25.005 91.7934 24.9403L91.5249 23.7124C91.4255 23.7322 91.2416 23.777 91.0029 23.777C90.5207 23.777 90.0881 23.6179 90.0881 22.7578V18.5568H91.6542V17.3636ZM92.8085 25H94.2951V17.3636H92.8085V25ZM93.5593 16.1854C94.0713 16.1854 94.4989 15.7876 94.4989 15.3004C94.4989 14.8132 94.0713 14.4105 93.5593 14.4105C93.0422 14.4105 92.6196 14.8132 92.6196 15.3004C92.6196 15.7876 93.0422 16.1854 93.5593 16.1854ZM97.2914 20.4659C97.2914 19.2479 98.0371 18.5518 99.0712 18.5518C100.08 18.5518 100.692 19.2131 100.692 20.3217V25H102.178V20.1428C102.178 18.2536 101.139 17.2642 99.5783 17.2642C98.4299 17.2642 97.6792 17.7962 97.3262 18.6065H97.2317V17.3636H95.8049V25H97.2914V20.4659ZM108.519 21.8331C108.524 23.1307 107.56 23.7472 106.725 23.7472C105.805 23.7472 105.169 23.081 105.169 22.0419V17.3636H103.682V22.2209C103.682 24.1151 104.721 25.0994 106.188 25.0994C107.336 25.0994 108.117 24.4929 108.47 23.6776H108.549V25H110.011V17.3636H108.519V21.8331ZM114.809 25.1541C116.475 25.1541 117.653 24.3338 117.991 23.0909L116.584 22.8374C116.316 23.5582 115.67 23.9261 114.824 23.9261C113.552 23.9261 112.697 23.1009 112.657 21.6293H118.086V21.1023C118.086 18.343 116.435 17.2642 114.705 17.2642C112.577 17.2642 111.175 18.8849 111.175 21.2315C111.175 23.603 112.557 25.1541 114.809 25.1541ZM112.662 20.5156C112.721 19.4318 113.507 18.4922 114.715 18.4922C115.868 18.4922 116.624 19.3473 116.629 20.5156H112.662ZM124.573 25H126.124L128.267 17.3736H128.346L130.489 25H132.035L134.864 14.8182H133.243L131.265 22.7081H131.17L129.107 14.8182H127.506L125.443 22.7031H125.349L123.365 14.8182H121.749L124.573 25ZM135.656 25H137.142V17.3636H135.656V25ZM136.406 16.1854C136.918 16.1854 137.346 15.7876 137.346 15.3004C137.346 14.8132 136.918 14.4105 136.406 14.4105C135.889 14.4105 135.467 14.8132 135.467 15.3004C135.467 15.7876 135.889 16.1854 136.406 16.1854ZM142.217 17.3636H140.651V15.5341H139.164V17.3636H138.045V18.5568H139.164V23.0661C139.159 24.4531 140.218 25.1243 141.391 25.0994C141.864 25.0945 142.182 25.005 142.356 24.9403L142.087 23.7124C141.988 23.7322 141.804 23.777 141.565 23.777C141.083 23.777 140.651 23.6179 140.651 22.7578V18.5568H142.217V17.3636ZM145.022 20.4659C145.022 19.2479 145.792 18.5518 146.851 18.5518C147.875 18.5518 148.487 19.2031 148.487 20.3217V25H149.973V20.1428C149.973 18.2386 148.929 17.2642 147.358 17.2642C146.17 17.2642 145.454 17.7812 145.096 18.6065H145.002V14.8182H143.535V25H145.022V20.4659ZM161.692 18.0348H163.268C162.925 16.0511 161.23 14.679 159.032 14.679C156.397 14.679 154.473 16.6626 154.473 19.9141C154.473 23.1357 156.342 25.1392 159.102 25.1392C161.573 25.1392 163.338 23.5185 163.338 20.9482V19.7898H159.335V21.0575H161.851C161.816 22.6982 160.732 23.7372 159.102 23.7372C157.307 23.7372 155.999 22.38 155.999 19.9041C155.999 17.4382 157.317 16.081 159.042 16.081C160.394 16.081 161.309 16.8267 161.692 18.0348ZM165.157 25H166.643V17.3636H165.157V25ZM165.908 16.1854C166.42 16.1854 166.847 15.7876 166.847 15.3004C166.847 14.8132 166.42 14.4105 165.908 14.4105C165.39 14.4105 164.968 14.8132 164.968 15.3004C164.968 15.7876 165.39 16.1854 165.908 16.1854ZM171.718 17.3636H170.152V15.5341H168.665V17.3636H167.547V18.5568H168.665V23.0661C168.66 24.4531 169.719 25.1243 170.893 25.0994C171.365 25.0945 171.683 25.005 171.857 24.9403L171.589 23.7124C171.489 23.7322 171.305 23.777 171.067 23.777C170.584 23.777 170.152 23.6179 170.152 22.7578V18.5568H171.718V17.3636ZM173.156 25H174.692V20.5604H179.768V25H181.309V14.8182H179.768V19.2429H174.692V14.8182H173.156V25ZM187.774 21.8331C187.779 23.1307 186.815 23.7472 185.979 23.7472C185.06 23.7472 184.423 23.081 184.423 22.0419V17.3636H182.937V22.2209C182.937 24.1151 183.976 25.0994 185.443 25.0994C186.591 25.0994 187.371 24.4929 187.724 23.6776H187.804V25H189.266V17.3636H187.774V21.8331ZM190.892 25H192.344V23.8118H192.468C192.737 24.299 193.284 25.1491 194.676 25.1491C196.525 25.1491 197.867 23.6676 197.867 21.1967C197.867 18.7209 196.505 17.2642 194.661 17.2642C193.244 17.2642 192.732 18.1293 192.468 18.6016H192.379V14.8182H190.892V25ZM192.349 21.1818C192.349 19.5859 193.045 18.527 194.343 18.527C195.69 18.527 196.366 19.6655 196.366 21.1818C196.366 22.7131 195.67 23.8814 194.343 23.8814C193.065 23.8814 192.349 22.7876 192.349 21.1818Z" fill="#181818"/>
        <path d="M30.082 24.7109C30.082 24.6406 30.0117 24.5703 29.9062 24.5703C29.8008 24.5703 29.7305 24.6406 29.7305 24.7109C29.7305 24.7812 29.8008 24.8516 29.9062 24.8164C30.0117 24.8164 30.082 24.7812 30.082 24.7109ZM28.9922 24.5352C28.9922 24.6055 29.0625 24.7109 29.168 24.7109C29.2383 24.7461 29.3438 24.7109 29.3789 24.6406C29.3789 24.5703 29.3438 24.5 29.2383 24.4648C29.1328 24.4297 29.0273 24.4648 28.9922 24.5352ZM30.5742 24.5C30.4688 24.5 30.3984 24.5703 30.3984 24.6758C30.3984 24.7461 30.5039 24.7812 30.6094 24.7461C30.7148 24.7109 30.7852 24.6758 30.75 24.6055C30.75 24.5352 30.6445 24.4648 30.5742 24.5ZM32.8594 11C28.0078 11 24.2812 14.7266 24.2812 19.5781C24.2812 23.4805 26.707 26.8203 30.2227 28.0156C30.6797 28.0859 30.8203 27.8047 30.8203 27.5938C30.8203 27.3477 30.8203 26.1523 30.8203 25.4141C30.8203 25.4141 28.3594 25.9414 27.832 24.3594C27.832 24.3594 27.4453 23.3398 26.8828 23.0938C26.8828 23.0938 26.0742 22.5312 26.918 22.5312C26.918 22.5312 27.7969 22.6016 28.2891 23.4453C29.0625 24.8164 30.3281 24.4297 30.8555 24.1836C30.9258 23.6211 31.1367 23.2344 31.418 22.9883C29.4492 22.7773 27.4453 22.4961 27.4453 19.1211C27.4453 18.1367 27.7266 17.6797 28.2891 17.0469C28.1836 16.8008 27.9023 15.8867 28.3945 14.6562C29.0977 14.4453 30.8203 15.6055 30.8203 15.6055C31.5234 15.3945 32.2617 15.3242 33 15.3242C33.7734 15.3242 34.5117 15.3945 35.2148 15.6055C35.2148 15.6055 36.9023 14.4102 37.6406 14.6562C38.1328 15.8867 37.8164 16.8008 37.7461 17.0469C38.3086 17.6797 38.6602 18.1367 38.6602 19.1211C38.6602 22.4961 36.5859 22.7773 34.6172 22.9883C34.9336 23.2695 35.2148 23.7969 35.2148 24.6406C35.2148 25.8008 35.1797 27.2773 35.1797 27.5586C35.1797 27.8047 35.3555 28.0859 35.8125 27.9805C39.3281 26.8203 41.7188 23.4805 41.7188 19.5781C41.7188 14.7266 37.7461 11 32.8594 11ZM27.6914 23.1289C27.6211 23.1641 27.6562 23.2695 27.6914 23.3398C27.7617 23.375 27.832 23.4102 27.9023 23.375C27.9375 23.3398 27.9375 23.2344 27.8672 23.1641C27.7969 23.1289 27.7266 23.0938 27.6914 23.1289ZM27.3047 22.8477C27.2695 22.918 27.3047 22.9531 27.375 22.9883C27.4453 23.0234 27.5156 23.0234 27.5508 22.9531C27.5508 22.918 27.5156 22.8828 27.4453 22.8477C27.375 22.8125 27.3398 22.8125 27.3047 22.8477ZM28.4297 24.1133C28.3945 24.1484 28.3945 24.2539 28.5 24.3242C28.5703 24.3945 28.6758 24.4297 28.7109 24.3594C28.7461 24.3242 28.7461 24.2188 28.6758 24.1484C28.6055 24.0781 28.5 24.043 28.4297 24.1133ZM28.043 23.5859C27.9727 23.6211 27.9727 23.7266 28.043 23.7969C28.1133 23.8672 28.1836 23.9023 28.2539 23.8672C28.2891 23.832 28.2891 23.7266 28.2539 23.6562C28.1836 23.5859 28.1133 23.5508 28.043 23.5859Z" fill="#181818"/>
    </svg>
)

const StyledLoginButton = styled(LoginButton)`
    cursor: pointer;
`

const LoginContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`

export const LoginBtn = () => (
    <a href="/auth/github">
        <StyledLoginButton />
    </a>
)

const Login = () => {
    const [auth, setAuth] = useState(null)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const redirectTo = urlParams.get('redirect_to')
        if (redirectTo) {
            window.localStorage.setItem('authRedirect', redirectTo)
        }

        const token = urlParams.get('token')

        if (token) {
            setAuth({ token })
        }
    }, [])

    useEffect(() => {
        if (auth) {
            const redirectTo = window.localStorage.getItem('authRedirect') || '/'
            window.localStorage.removeItem('authRedirect')
            window.localStorage.setItem('token', auth.token)
            window.location.href = redirectTo
        }
    }, [auth])

    return (
        <LoginContainer>
            {
                auth ? (
                    'loading...'
                ) : (
                    <LoginBtn />
                )
            }
        </LoginContainer>
    )
}

export default Login
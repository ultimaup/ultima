const { getUltimaServer } = require('./ultimaServer')

const logo = `
    <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" height="16" width="16" class="octicon octicon-gear UnderlineNav-octicon">
        <g filter="url(#filter0_i)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.6891 1.89917C9.85214 0.689499 12.3456 0 15 0C23.2843 0 30 6.71573 30 15C30 23.2843 23.2843 30 15 30C6.71573 30 0 23.2843 0 15C0 11.8307 0.98293 8.89089 2.66058 6.46891C3.28041 7.12908 4.1611 7.54143 5.13811 7.54143C7.01465 7.54143 8.5359 6.02019 8.5359 4.14364C8.5359 3.28337 8.21619 2.49777 7.6891 1.89917ZM6.46408 15C6.46408 10.2857 10.2857 6.46408 15 6.46408C19.7142 6.46408 23.5359 10.2857 23.5359 15C23.5359 19.7142 19.7142 23.5359 15 23.5359C10.2857 23.5359 6.46408 19.7142 6.46408 15Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.68912 1.89918C5.68414 3.02045 3.96302 4.58865 2.6606 6.46893C2.08989 5.8611 1.74033 5.04319 1.74033 4.14364C1.74033 2.26709 3.26157 0.74585 5.13812 0.74585C6.15439 0.74585 7.06646 1.19202 7.68912 1.89918Z" fill="currentColor"></path>
        </g>
        <defs>
        <filter id="filter0_i" x="0" y="0" width="30" height="30" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"></feBlend>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"></feColorMatrix>
            <feOffset></feOffset>
            <feGaussianBlur stdDeviation="2.23757"></feGaussianBlur>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"></feComposite>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0"></feColorMatrix>
            <feBlend mode="normal" in2="shape" result="effect1_innerShadow"></feBlend>
        </filter>
        </defs>
    </svg>
`

const init = () => {
    const nav = document.querySelector('nav.js-repo-nav')
    if (!nav.getAttribute('data-ultima-init')) {
        nav.setAttribute('data-ultima-init', true)
        nav.children[0].children[2].insertAdjacentHTML('afterEnd', 
            `<li class="d-flex">
                <a class="js-selected-navigation-item UnderlineNav-item" href="#/ultima" id="ultima-navitem">
                    <div class="d-inline">
                        ${logo}
                    </div>
                    Ultima
                </a>
            </li>`
        )
    }
}

const loadUltimaPage = async () => {
    const selectedNavItem = document.querySelector('nav.js-repo-nav .selected')
    selectedNavItem.classList.remove('js-selected-navigation-item', 'selected')
    selectedNavItem.setAttribute('aria-current', 'false')

    const ultimaNavItem = document.getElementById('ultima-navitem')
    ultimaNavItem.classList.add('selected', 'js-selected-navigation-item')
    ultimaNavItem.setAttribute('aria-current', '')

    const main = document.querySelector('main')
    const content = document.querySelector('main > div:last-child')
    content.parentNode.removeChild(content)
    const ultimaServer = await getUltimaServer()

    const ultimaPage = `
        <div class="container-xl clearfix new-discussion-timeline  px-3 px-md-4 px-lg-5">
            <iframe style="border: none; width: 100%; height: 800px" src="${ultimaServer}/embed/github"></iframe>
        </div>
    `

    main.insertAdjacentHTML('beforeend', ultimaPage)
}

window.addEventListener('hashchange', () => {
    const hash = window.location.hash
    if (hash === '#/ultima') {
        loadUltimaPage()
    }
})

init()
if (window.location.hash === '#/ultima') {
    loadUltimaPage()
}
setInterval(() => {
    init()
}, 100)

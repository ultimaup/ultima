(function() {
    function docReady(fn) {
        // see if DOM is already available
        if (document.readyState === "complete" || document.readyState === "interactive") {
            // call on next available tick
            setTimeout(fn, 1);
        } else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }

    docReady((() => {
        const [asdf] = document.querySelectorAll('.repository')
        console.log(asdf)
        if (asdf) {
            const navbar = document.querySelector('.navbar > .item:last-of-type')
            if (navbar) {
                const [_,owner, repoName] = document.location.pathname.split('/')
                navbar.insertAdjacentHTML('afterend',
                `<a class="item" target="_blank" href="/repo/${owner}/${repoName}">
                    <svg aria-hidden="true" class="octicon" height="16" role="img" viewBox="0 0 12 16" width="12" style="display: inline-block; fill: currentcolor; user-select: none; vertical-align: text-bottom;"><path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"></path></svg>
                    &nbsp; View in Ultima
                </a>`
                )
            }
        }

    }))
})();


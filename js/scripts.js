(function () {
    var header = document.getElementById("siteHeader");
    var threshold = 40;

    function onScroll() {
        if (!header) {
            return;
        }
        var fixed = window.scrollY > threshold;
        if (fixed) {
            if (!header.classList.contains("is-fixed")) {
                header.style.height = header.offsetHeight + "px";
                header.classList.add("is-fixed");
            }
        } else {
            header.classList.remove("is-fixed");
            header.style.height = "";
        }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    document.querySelectorAll('a[href="#"]').forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
        });
    });

    if (typeof Swiper !== "undefined" && document.querySelector(".hero-swiper")) {
        new Swiper(".hero-swiper", {
            loop: true,
            speed: 750,
            autoplay: {
                delay: 4500,
                disableOnInteraction: false
            },
            navigation: {
                nextEl: ".hero-next",
                prevEl: ".hero-prev"
            }
        });
    }

    var revealItems = document.querySelectorAll("[data-reveal]");
    if ("IntersectionObserver" in window && revealItems.length) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-shown");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });
        revealItems.forEach(function (item) {
            observer.observe(item);
        });
    } else {
        revealItems.forEach(function (item) {
            item.classList.add("is-shown");
        });
    }
})();

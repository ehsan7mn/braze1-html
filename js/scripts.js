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

    function initHeroGlitch(swiper) {
        var canvas = document.getElementById("heroGlitch");
        var box = document.querySelector(".hero-swiper");
        if (!canvas || !box || !window.WebGLRenderingContext) {
            return;
        }
        var gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: true });
        if (!gl) {
            return;
        }
        var sources = Array.prototype.map.call(document.querySelectorAll(".hero-slide"), function (img) {
            return img.getAttribute("src");
        });
        var images = [];
        var loaded = 0;
        var frames = [];
        var current = 0;
        var anim = null;
        var tex = [createTex(), createTex(), createTex()];
        var program = createProgram();
        if (!program) {
            return;
        }
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var loc = {
            pos: gl.getAttribLocation(program, "aPos"),
            tex: gl.getUniformLocation(program, "uTex"),
            tex2: gl.getUniformLocation(program, "uTex2"),
            disp: gl.getUniformLocation(program, "uDisp"),
            factor: gl.getUniformLocation(program, "uDispFactor"),
            effect: gl.getUniformLocation(program, "uEffect")
        };
        uploadDisp();

        function createTex() {
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            return texture;
        }

        function createProgram() {
            function shader(type, source) {
                var sh = gl.createShader(type);
                gl.shaderSource(sh, source);
                gl.compileShader(sh);
                if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                    return null;
                }
                return sh;
            }
            var vs = shader(gl.VERTEX_SHADER, "attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}");
            var fs = shader(gl.FRAGMENT_SHADER, "precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform sampler2D uTex2;uniform sampler2D uDisp;uniform float uDispFactor;uniform float uEffect;void main(){vec4 disp=texture2D(uDisp,vUv);vec2 p1=vec2(vUv.x+uDispFactor*(disp.r*uEffect),vUv.y);vec2 p2=vec2(vUv.x-(1.0-uDispFactor)*(disp.r*uEffect),vUv.y);gl_FragColor=mix(texture2D(uTex,p1),texture2D(uTex2,p2),uDispFactor);}");
            if (!vs || !fs) {
                return null;
            }
            var prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                return null;
            }
            return prog;
        }

        function uploadDisp() {
            var size = 256;
            var data = new Uint8Array(size * size * 4);
            var raw = [];
            var x;
            var y;
            for (y = 0; y < size; y++) {
                raw[y] = [];
                for (x = 0; x < size; x++) {
                    var n = Math.sin(x * 0.37) * Math.cos(y * 0.23) + Math.sin((x + y) * 0.11);
                    raw[y][x] = (n + 2) / 4;
                }
            }
            for (y = 0; y < size; y++) {
                for (x = 0; x < size; x++) {
                    var sum = 0;
                    var count = 0;
                    var oy;
                    var ox;
                    for (oy = -2; oy <= 2; oy++) {
                        for (ox = -2; ox <= 2; ox++) {
                            var yy = Math.min(size - 1, Math.max(0, y + oy));
                            var xx = Math.min(size - 1, Math.max(0, x + ox));
                            sum += raw[yy][xx];
                            count++;
                        }
                    }
                    var value = Math.round((sum / count) * 255);
                    var i = (y * size + x) * 4;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                    data[i + 3] = 255;
                }
            }
            gl.bindTexture(gl.TEXTURE_2D, tex[2]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        }

        function cover(img) {
            var w = canvas.width;
            var h = canvas.height;
            var c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            var ctx = c.getContext("2d");
            var ir = img.naturalWidth / img.naturalHeight;
            var cr = w / h;
            var dw;
            var dh;
            var dx;
            var dy;
            if (ir > cr) {
                dh = h;
                dw = h * ir;
                dx = (w - dw) / 2;
                dy = 0;
            } else {
                dw = w;
                dh = w / ir;
                dx = 0;
                dy = (h - dh) / 2;
            }
            ctx.drawImage(img, dx, dy, dw, dh);
            return c;
        }

        function uploadImage(texture, source) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        }

        function resize() {
            var rect = box.getBoundingClientRect();
            var w = Math.max(2, Math.round(rect.width));
            var h = Math.max(2, Math.round(rect.height));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            frames = images.map(cover);
            if (frames.length) {
                uploadImage(tex[0], frames[current] || frames[0]);
                uploadImage(tex[1], frames[current] || frames[0]);
                draw(0);
            }
        }

        function draw(factor, effect) {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(loc.pos);
            gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex[0]);
            gl.uniform1i(loc.tex, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, tex[1]);
            gl.uniform1i(loc.tex2, 1);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, tex[2]);
            gl.uniform1i(loc.disp, 2);
            gl.uniform1f(loc.factor, factor);
            gl.uniform1f(loc.effect, effect === undefined ? 0.55 : effect);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        function go(index) {
            if (!frames.length || index === current) {
                return;
            }
            uploadImage(tex[0], frames[current]);
            uploadImage(tex[1], frames[index]);
            var from = current;
            current = index;
            if (anim) {
                cancelAnimationFrame(anim);
            }
            var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            var forward = index > from || (from === frames.length - 1 && index === 0);
            var effect = forward ? 0.55 : -0.55;
            if (reduce) {
                uploadImage(tex[0], frames[index]);
                draw(0, effect);
                return;
            }
            var start = performance.now();
            var duration = 1100;
            function step(now) {
                var t = Math.min(1, (now - start) / duration);
                var eased = 1 - Math.pow(1 - t, 3);
                draw(eased, effect);
                if (t < 1) {
                    anim = requestAnimationFrame(step);
                } else {
                    uploadImage(tex[0], frames[index]);
                    draw(0, effect);
                }
            }
            anim = requestAnimationFrame(step);
        }

        sources.forEach(function (src, index) {
            var img = new Image();
            img.onload = function () {
                images[index] = img;
                loaded++;
                if (loaded === sources.length) {
                    box.classList.add("is-glitch");
                    resize();
                    window.addEventListener("resize", resize);
                }
            };
            img.src = src;
        });

        swiper.on("slideChangeTransitionStart", function () {
            if (loaded === sources.length) {
                go(swiper.realIndex);
            }
        });
    }

    if (typeof Swiper !== "undefined" && document.querySelector(".hero-swiper")) {
        var heroSwiper = new Swiper(".hero-swiper", {
            loop: true,
            effect: "fade",
            fadeEffect: { crossFade: true },
            speed: 1100,
            autoplay: {
                delay: 4500,
                disableOnInteraction: false
            },
            navigation: {
                nextEl: ".hero-next",
                prevEl: ".hero-prev"
            }
        });
        initHeroGlitch(heroSwiper);
    }

    if (typeof Swiper !== "undefined" && document.querySelector(".review-swiper")) {
        new Swiper(".review-swiper", {
            slidesPerView: 3,
            spaceBetween: 16,
            loop: true,
            watchOverflow: true,
            speed: 650,
            autoplay: {
                delay: 4200,
                disableOnInteraction: false
            },
            navigation: {
                nextEl: ".review-next",
                prevEl: ".review-prev"
            }
        });
    }

    var revealItems = document.querySelectorAll("[data-reveal]");
    function inView(el, topRatio, bottomRatio) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        return rect.top < vh * topRatio && rect.bottom > vh * bottomRatio;
    }
    function revealInView() {
        revealItems.forEach(function (item) {
            if (!item.classList.contains("is-shown") && inView(item, 0.92, 0.05)) {
                item.classList.add("is-shown");
            }
        });
    }
    if (revealItems.length) {
        window.addEventListener("scroll", revealInView, { passive: true });
        window.addEventListener("resize", revealInView);
        revealInView();
    }

    var counters = document.querySelectorAll("[data-count]");
    function runCount(el) {
        var target = parseInt(el.getAttribute("data-count"), 10);
        var start = performance.now();
        var duration = 1750;
        function tick(now) {
            var progress = Math.min(1, (now - start) / duration);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased).toLocaleString("en-US");
            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        }
        requestAnimationFrame(tick);
    }
    var logoSets = document.querySelectorAll(".logo-set");
    var logoMarquee = document.querySelector(".logo-marquee");
    if (logoSets.length) {
        var seed = logoSets[0].innerHTML;
        var guard = 0;
        while (logoSets[0].getBoundingClientRect().width < window.innerWidth + 80 && guard < 5) {
            logoSets.forEach(function (set) {
                set.insertAdjacentHTML("beforeend", seed);
            });
            guard += 1;
        }
    }
    if (logoMarquee) {
        var logoImgs = logoMarquee.querySelectorAll("img");
        var paintLogos = function () {
            var box = logoMarquee.getBoundingClientRect();
            var mid = box.left + box.width / 2;
            var half = box.width / 2 || 1;
            logoImgs.forEach(function (img) {
                var rect = img.getBoundingClientRect();
                var center = rect.left + rect.width / 2;
                var dist = Math.min(1, Math.abs(center - mid) / half);
                img.style.filter = "grayscale(" + dist.toFixed(3) + ")";
            });
            requestAnimationFrame(paintLogos);
        };
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            paintLogos();
        }
    }

    document.querySelectorAll(".review-card").forEach(function (card) {
        var text = card.querySelector(".review-text");
        if (text) {
            text.style.display = "block";
            text.style.webkitLineClamp = "unset";
        }
        card.style.height = "auto";
        card.style.setProperty("--full", card.scrollHeight + "px");
        card.style.height = "";
        if (text) {
            text.style.display = "";
            text.style.webkitLineClamp = "";
        }
    });

    var blogCards = document.querySelectorAll(".blog-card");
    var blogSection = document.querySelector(".blog-section");
    var blogShown = !blogCards.length;
    var revealBlog = function () {};
    if (blogCards.length) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            blogCards.forEach(function (card) { card.classList.add("is-shown"); });
            blogShown = true;
        } else if (blogSection) {
            blogShown = false;
            revealBlog = function () {
                if (blogShown) {
                    return;
                }
                if (!inView(blogSection, 0.9, 0.08)) {
                    return;
                }
                blogShown = true;
                blogCards.forEach(function (card, index) {
                    window.setTimeout(function () {
                        card.classList.add("is-shown");
                    }, index * 500);
                });
                window.removeEventListener("scroll", revealBlog);
                window.removeEventListener("resize", revealBlog);
            };
            window.addEventListener("scroll", revealBlog, { passive: true });
            window.addEventListener("resize", revealBlog);
            revealBlog();
        }
    }

    var stats = document.querySelector(".stats-card");
    var counted = false;
    function maybeCount() {
        if (counted || !stats || !counters.length) {
            return;
        }
        if (!inView(stats, 0.9, 0.1)) {
            return;
        }
        counted = true;
        counters.forEach(runCount);
        window.removeEventListener("scroll", maybeCount);
        window.removeEventListener("resize", maybeCount);
    }
    if (stats && counters.length) {
        window.addEventListener("scroll", maybeCount, { passive: true });
        window.addEventListener("resize", maybeCount);
        maybeCount();
    }

    var pulse = window.setInterval(function () {
        revealInView();
        if (typeof revealBlog === "function") {
            revealBlog();
        }
        maybeCount();
        var headsLeft = false;
        revealItems.forEach(function (item) {
            if (!item.classList.contains("is-shown")) {
                headsLeft = true;
            }
        });
        if (!headsLeft && blogShown && counted) {
            window.clearInterval(pulse);
        }
    }, 200);
})();

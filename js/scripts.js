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
            spaceBetween: 24,
            loop: true,
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
    if ("IntersectionObserver" in window && counters.length) {
        var countObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    counters.forEach(runCount);
                    countObserver.disconnect();
                }
            });
        }, { threshold: 0.4 });
        var stats = document.querySelector(".stats-card");
        if (stats) {
            countObserver.observe(stats);
        }
    } else {
        counters.forEach(runCount);
    }
})();

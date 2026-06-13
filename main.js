/* ============================================================
   Nova Reyes — Portfolio interactions
   ============================================================ */
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ---------------------------------------------------------
     1. WebGL Hero — animated flowing shader (Three.js)
  --------------------------------------------------------- */
  let renderer, threeReady = false, uMouse = { x: .5, y: .5 }, uTarget = { x: .5, y: .5 };
  function initWebGL() {
    const canvas = document.getElementById('webgl');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);

    const uniforms = {
      uTime:  { value: 0 },
      uRes:   { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(.5, .5) },
      uA:     { value: new THREE.Color('#8d4ffe') }, // accent purple
      uB:     { value: new THREE.Color('#5a3da8') }, // medium violet glow
      uC:     { value: new THREE.Color('#0d0a18') }, // base ink (dark indigo)
      uD:     { value: new THREE.Color('#b98cff') }, // soft lilac highlight
    };

    const frag = `
      precision highp float;
      uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;
      uniform vec3 uA, uB, uC, uD;
      varying vec2 vUv;

      // simplex-ish flow noise
      vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
      float snoise(vec2 v){
        const vec4 C=vec4(0.211324865,0.366025403,-0.577350269,0.024390243);
        vec2 i=floor(v+dot(v,C.yy));
        vec2 x0=v-i+dot(i,C.xx);
        vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
        vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
        i=mod289(i);
        vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
        vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
        m=m*m; m=m*m;
        vec3 x=2.0*fract(p*C.www)-1.0;
        vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
        m*=1.79284291-0.85373472*(a0*a0+h*h);
        vec3 g; g.x=a0.x*x0.x+h.x*x0.y;
        g.yz=a0.yz*x12.xz+h.yz*x12.yw;
        return 130.0*dot(m,g);
      }
      float fbm(vec2 p){
        float s=0.0,a=0.5;
        for(int i=0;i<5;i++){ s+=a*snoise(p); p*=2.0; a*=0.5; }
        return s;
      }
      void main(){
        vec2 uv=vUv;
        float asp=uRes.x/uRes.y;
        vec2 p=(uv-0.5); p.x*=asp;
        float t=uTime*0.07;
        vec2 mp=(uMouse-0.5); mp.x*=asp;

        // base: subtle vertical lift toward the top
        vec3 col = mix(uC, uC*1.55, smoothstep(1.0,0.0,uv.y)*0.6);

        // large, soft, slowly-drifting glows -> clean mesh gradient (no texture)
        vec2 c1 = vec2(sin(t*0.6)*0.35 - 0.28, cos(t*0.45)*0.26 + 0.20);
        vec2 c2 = vec2(cos(t*0.5)*0.46 + 0.36, sin(t*0.55)*0.30 - 0.16);
        float g1 = smoothstep(1.00, 0.04, length(p - c1));
        float g2 = smoothstep(1.15, 0.04, length(p - c2));
        col = mix(col, uB, g1*0.80);
        col = mix(col, uA, g2*0.42);

        // soft mouse-follow highlight
        float gm = smoothstep(0.7, 0.0, length(p - mp));
        col = mix(col, uD, gm*0.14);

        // gentle vignette so the headline reads
        float vig=smoothstep(1.5,0.5,length(uv-0.5));
        col=mix(uC, col, 0.92*vig);
        gl_FragColor=vec4(col,1.0);
      }`;

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position,1.0);}`,
      fragmentShader: frag,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    function resize() {
      const hero = canvas.parentElement;
      const w = hero.clientWidth, h = hero.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w * dpr, h * dpr);
      renderer.render(scene, camera); // repaint immediately so a newly-exposed area never shows a stale buffer
    }
    resize();
    window.addEventListener('resize', resize);
    // ResizeObserver catches layout-driven size changes (orientation, mobile URL bar, dynamic vh) that 'resize' can miss.
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);

    const clock = new THREE.Clock();
    let raf;
    function render() {
      uTarget.x += (uMouse.x - uTarget.x) * .06;
      uTarget.y += (uMouse.y - uTarget.y) * .06;
      uniforms.uMouse.value.set(uTarget.x, uTarget.y);
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    }
    if (!prefersReduced) render(); else renderer.render(scene, camera);
    threeReady = true;

    // pause when hero offscreen (perf)
    const io = new IntersectionObserver(([e]) => {
      if (prefersReduced) return;
      if (e.isIntersecting) { if (!raf) render(); }
      else { cancelAnimationFrame(raf); raf = null; }
    }, { threshold: 0 });
    io.observe(canvas.parentElement);

    window.addEventListener('mousemove', (e) => {
      uMouse.x = e.clientX / window.innerWidth;
      uMouse.y = 1 - e.clientY / window.innerHeight;
    });
  }

  /* ---------------------------------------------------------
     2. Preloader
  --------------------------------------------------------- */
  function runLoader(done) {
    const loader = document.getElementById('loader');
    const num = document.getElementById('loaderNum');
    const bar = document.getElementById('loaderBar');
    const words = document.querySelectorAll('[data-word]');
    if (!loader) { done(); return; }

    if (prefersReduced) {
      loader.style.display = 'none'; done(); return;
    }

    // cycle words
    gsap.set(words[0], { y: 0, opacity: 1 });
    words.forEach((w, i) => { if (i) gsap.set(w, { y: 20, opacity: 0 }); });
    const wt = gsap.timeline();
    words.forEach((w, i) => {
      if (i === 0) return;
      wt.to(words[i - 1], { y: -20, opacity: 0, duration: .35, ease: 'power2.in' }, i * .42)
        .fromTo(w, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: 'power2.out' }, i * .42 + .1);
    });

    const counter = { v: 0 };
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      gsap.killTweensOf([counter, '.loader__inner', '.loader__bar', loader]);
      loader.classList.add('is-done');
      gsap.set(loader, { display: 'none', clearProps: 'opacity' });
      done();
    };
    // Safety net: if rAF stalls (throttled background tab, slow device) the GSAP
    // outro could freeze and trap the page behind the loader — force-complete via a timer.
    const fallback = setTimeout(finish, 6000);

    gsap.to(counter, {
      v: 100, duration: 1.9, ease: 'power2.inOut',
      onUpdate: () => {
        const val = Math.round(counter.v);
        num.textContent = val;
        bar.style.width = val + '%';
      },
      onComplete: () => {
        const tl = gsap.timeline({ onComplete: () => { clearTimeout(fallback); finish(); } });
        tl.to('.loader__inner, .loader__bar', { opacity: 0, y: -20, duration: .5, ease: 'power2.in' })
          .to(loader, { yPercent: -100, duration: .9, ease: 'expo.inOut' }, '-=.1');
      }
    });
  }

  /* ---------------------------------------------------------
     3. Smooth scroll (Lenis) + GSAP ScrollTrigger sync
  --------------------------------------------------------- */
  let lenis;
  function initScroll() {
    if (typeof Lenis === 'undefined' || isTouch || prefersReduced) return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    window.lenis = lenis; // expose for debugging / programmatic scroll
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------
     4. Hero intro + scroll-reveal animations
  --------------------------------------------------------- */
  function initReveal() {
    if (prefersReduced) return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero title lines.
    // NOTE: .hero__tag/.hero__lead/.hero__corner carry the .reveal-up class (opacity:0 in CSS)
    // and the generic reveal handler below intentionally skips anything inside .hero — so we must
    // animate them to an EXPLICIT opacity:1 here (gsap.from would resolve the end state to the
    // current computed opacity, which is 0, and leave them invisible).
    const tl = gsap.timeline({ delay: .1 });
    tl.to('.hero__title .line__inner', { y: 0, duration: 1.1, stagger: .1, ease: 'expo.out' })
      .fromTo('.hero__tag', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power2.out' }, '-=.8')
      .fromTo('.hero__lead', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power2.out' }, '-=.6')
      .fromTo('.hero__scroll', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power2.out' }, '-=.7')
      .fromTo('.hero__corner', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .1, ease: 'power2.out' }, '-=.6');

    // generic reveal-up
    gsap.utils.toArray('.reveal-up').forEach((el) => {
      if (el.closest('.hero')) return; // hero handled above
      gsap.to(el, {
        y: 0, opacity: 1, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    // Split-line word reveal for big headings
    gsap.utils.toArray('[data-split]').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(w => `<span class="w"><span>${w}</span></span>`).join(' ');
      el.querySelectorAll('.w').forEach(w => { w.style.display = 'inline-block'; w.style.overflow = 'hidden'; w.querySelector('span').style.display = 'inline-block'; });
      gsap.from(el.querySelectorAll('.w span'), {
        yPercent: 110, duration: 1, ease: 'expo.out', stagger: .03,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // Masked line reveals outside the hero (e.g. the big contact CTA).
    // These use the same .line/.line__inner markup whose CSS start state is translateY(110%);
    // without this they'd stay hidden behind overflow:hidden.
    gsap.utils.toArray('.line__inner').forEach((el) => {
      if (el.closest('.hero')) return; // hero lines are driven by the intro timeline
      gsap.to(el, {
        y: 0, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: el.closest('.contact, section') || el, start: 'top 80%' }
      });
    });

    // Project cards
    gsap.utils.toArray('[data-project]').forEach((card) => {
      gsap.from(card, {
        y: 60, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 85%' }
      });
    });

    // Parallax on project visuals
    gsap.utils.toArray('.project__visual').forEach((v) => {
      gsap.fromTo(v, { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: v, scrub: true, start: 'top bottom', end: 'bottom top' }
      });
    });

    // Footer big word parallax
    gsap.fromTo('.footer__big', { yPercent: 12 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.footer', scrub: true, start: 'top bottom', end: 'bottom bottom' }
    });

    // Hero content fade on scroll out
    gsap.to('.hero__content', {
      y: -80, opacity: .2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'bottom bottom', end: 'bottom top', scrub: true }
    });
  }

  /* ---------------------------------------------------------
     5. Stat counters
  --------------------------------------------------------- */
  function initCounters() {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => {
          if (prefersReduced) { el.textContent = target; return; }
          gsap.to(obj, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v); } });
        }
      });
    });
  }

  /* ---------------------------------------------------------
     6. Marquee loop
  --------------------------------------------------------- */
  function initMarquee() {
    if (prefersReduced) return;
    const track = document.getElementById('marquee');
    if (!track) return;
    const first = track.querySelector('span');
    gsap.to(track, {
      x: () => -first.offsetWidth,
      duration: 22, ease: 'none', repeat: -1,
    });
  }

  /* ---------------------------------------------------------
     7. Custom cursor + magnetic + tilt
  --------------------------------------------------------- */
  function initCursor() {
    if (isTouch) return;
    const dot = document.querySelector('.cursor');
    const fol = document.querySelector('.cursor-follow');
    const label = document.querySelector('.cursor-label');
    let mx = innerWidth / 2, my = innerHeight / 2, fx = mx, fy = my;

    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
    gsap.ticker.add(() => {
      fx += (mx - fx) * .18; fy += (my - fy) * .18;
      gsap.set(dot, { x: mx, y: my });
      gsap.set(fol, { x: fx, y: fy });
    });

    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', () => { fol.classList.add('is-active'); label.textContent = el.dataset.cursor; });
      el.addEventListener('mouseleave', () => { fol.classList.remove('is-active'); label.textContent = ''; });
    });
    // generic hover grow for links/buttons
    document.querySelectorAll('a, button, [data-svc]').forEach((el) => {
      if (el.hasAttribute('data-cursor')) return;
      el.addEventListener('mouseenter', () => fol.classList.add('is-active'));
      el.addEventListener('mouseleave', () => { if (!el.matches(':hover')) fol.classList.remove('is-active'); fol.classList.remove('is-active'); });
    });

    // Magnetic buttons
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: x * .3, y: y * .3, duration: .6, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.4)' }));
    });

    // Tilt on project media
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        gsap.to(el, { rotateY: x * 8, rotateX: -y * 8, transformPerspective: 800, duration: .5, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: .7, ease: 'power2.out' }));
    });
  }

  /* ---------------------------------------------------------
     8. Services accordion
  --------------------------------------------------------- */
  function initServices() {
    document.querySelectorAll('[data-svc]').forEach((svc) => {
      svc.querySelector('.svc__row').addEventListener('click', () => {
        const open = svc.classList.contains('is-open');
        document.querySelectorAll('[data-svc]').forEach(s => s.classList.remove('is-open'));
        if (!open) svc.classList.add('is-open');
        ScrollTrigger.refresh();
      });
    });
  }

  // Work grid shows the first 6 projects; "Show more" reveals the rest.
  function initWorkMore() {
    const work = document.querySelector('.work');
    const btn = document.querySelector('[data-work-more]');
    if (!work || !btn) return;
    const extras = [...work.querySelectorAll('.project--extra')];
    const label = btn.querySelector('.work__more-label');
    btn.addEventListener('click', () => {
      const expanded = work.classList.toggle('is-expanded');
      if (label) label.textContent = expanded ? 'Show less' : 'Show more work';
      if (expanded && !prefersReduced && typeof gsap !== 'undefined') {
        gsap.fromTo(extras, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .06, ease: 'power3.out', clearProps: 'opacity,transform' });
      }
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      if (!expanded) {
        const target = btn.getBoundingClientRect().top + window.scrollY - 160;
        window.lenis ? window.lenis.scrollTo(target) : window.scrollTo({ top: target, behavior: 'smooth' });
      }
    });
  }

  // Process cards collapse to titles; click a card to expand its detail (independent toggles).
  function initProcess() {
    document.querySelectorAll('[data-pcard]').forEach((card) => {
      card.querySelector('.pcard__row').addEventListener('click', () => {
        card.classList.toggle('is-open');
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      });
    });
  }

  /* ---------------------------------------------------------
     9. Nav: scroll progress, menu, smooth anchor
  --------------------------------------------------------- */
  function initNav() {
    const bar = document.getElementById('scrollBar');
    const update = () => {
      const h = document.documentElement;
      const sc = (h.scrollTop || document.body.scrollTop);
      const max = h.scrollHeight - h.clientHeight;
      if (bar) bar.style.width = (max > 0 ? (sc / max) * 100 : 0) + '%';
    };
    (lenis ? lenis.on('scroll', update) : window.addEventListener('scroll', update, { passive: true }));
    update();

    // Burger / mobile menu
    const burger = document.getElementById('burger');
    const closeMenu = () => document.body.classList.remove('menu-open');
    burger?.addEventListener('click', () => document.body.classList.toggle('menu-open'));
    document.querySelectorAll('[data-menu-link]').forEach(a => a.addEventListener('click', closeMenu));

    // Smooth anchor scrolling
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id === '#case') return; // handled by the case-study overlay, not smooth-scroll
        if (id === '#' || id === '#top') {
          e.preventDefault(); closeMenu();
          lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const t = document.querySelector(id);
        if (t) { e.preventDefault(); closeMenu(); lenis ? lenis.scrollTo(t, { offset: -10 }) : t.scrollIntoView({ behavior: 'smooth' }); }
      });
    });

    document.getElementById('backTop')?.addEventListener('click', () => {
      lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     10. Case-study detail overlay
     Clicking a project opens an in-page case study (not a link-out).
     Content is restated/expanded from the cards — no fabricated metrics.
  --------------------------------------------------------- */
  const PROJECTS = {
    taisin: {
      index: '01', cat: 'B2B Industrial · Brand & SEO', title: 'Tai Sin Power Distribution',
      img: 'assets/work/taisin.jpg',
      intro: 'Product Launch & Full-Funnel Marketing — Busbar Trunking System (SG / VN / MY). Built from zero — new brand, new market position, new everything.',
      meta: [['Role', 'Marketing Lead'], ['Markets', 'SG · VN · MY'], ['Built with', 'Adobe CS · WordPress']],
      tags: ['Brand Identity', 'Collateral', 'Technical SEO', 'GEO', '3D & Video'],
      links: [
        { url: 'https://www.taisinelectric.com', label: 'Visit taisinelectric.com' },
        { url: 'https://www.behance.net/gallery/249482029/Full-Funnel-Marketing-Busway-(SGVNMY)', label: 'View on Behance' }
      ],
      blocks: [
        { type: 'section', title: 'Project Overview' },
        { type: 'text', text: 'Managed the full marketing function for a new brand launch — from zero.' },
        { type: 'list', items: [
          'Brand identity development with the BD team; marketing plan & budget across SG, VN, MY',
          'Coordinated with sales, engineering & production teams',
          'Full-funnel collateral: catalogs, factsheets, 3D, video, web',
          'SEO & GEO implementation — brand ranks on Google and surfaces in AI-generated recommendations (Google AI Mode, ChatGPT)'
        ] },
        { type: 'section', title: 'Strategy & Research' },
        { type: 'list', items: [
          'Competitor analysis: mapped competitor positioning, pricing signals, USP gaps and visual language across SG / VN / MY',
          'Customer persona development & USP identification for each segment (M&E consultants, contractors, property developers)',
          'Customer Touchpoint Map: Awareness → Consideration → Purchase → Post-Purchase — to prioritise materials and channels',
          'Marketing plan & budget allocation across all three markets'
        ] },
        { type: 'section', title: 'Marketing Collateral — 3 Product Lines' },
        { type: 'list', items: [
          'Company Profile',
          'Product catalogs, factsheets and flyers — for each product line',
          'Installation guides — coordinated with engineering for technical accuracy',
          'Sales presentations — for client meetings and events',
          '3D modelling & animation — briefed and coordinated with an external 3D production partner; used for product education, trade shows and installer onboarding',
          'Marketing & social-media templates for a consistent brand rollout'
        ] },
        { type: 'subhead', text: 'Product factsheets · catalogs · company profile' },
        { type: 'gallery', images: [
          { src: 'assets/work/taisin/collateral-factsheets.jpg', alt: 'Product factsheets' },
          { src: 'assets/work/taisin/factsheet-overview.jpg', alt: 'Busbar trunking system factsheet — system overview and product features' },
          { src: 'assets/work/taisin/catalog-cover.jpg', alt: 'LA/B TECO busbar trunking system catalogue cover' },
          { src: 'assets/work/taisin/catalog-spreads.jpg', alt: 'Catalogue and company-profile spreads' }
        ] },
        { type: 'section', title: '3D Product Visualization — Full System Overview' },
        { type: 'text', text: 'Created in collaboration with an external 3D production partner. This annotated visualization maps the full busbar trunking system — from the transformer and outdoor busbar through to data-centre rack distribution — across 13 labeled components. Used in presentations, trade shows and digital channels to explain the complete system at a glance.' },
        { type: 'image', src: 'assets/work/taisin/system-3d.jpg', alt: 'Annotated 3D overview of the full busbar trunking system with 13 labeled components' },
        { type: 'image', src: 'assets/work/taisin/data-center-busway.gif', alt: 'Animated 3D walkthrough of busbar trunking distributing power across a data centre', caption: '3D animation — busbar trunking distributing power through a data centre.' },
        { type: 'section', title: 'Website Content & SEO' },
        { type: 'text', text: 'Built all website content from scratch across three markets — Singapore, Vietnam and Malaysia. No content inherited, no rankings to start from. Every product and landing page was researched, written and structured from zero, with full on-page SEO.' },
        { type: 'list', items: [
          'Multiple group websites ranking on page 1 for target keywords across SG, VN, MY',
          'Rankings maintained post-engagement with no active management',
          'Brand recommended by AI models (Google AI Mode, ChatGPT) for relevant queries',
          'Voltage Drop Calculator built as a lead-generation tool for the consideration stage'
        ] },
        { type: 'section', title: 'GEO — Generative Engine Optimisation' },
        { type: 'text', text: 'Across three markets — Singapore, Vietnam and Malaysia.' },
        { type: 'list', items: [
          'Multiple group websites cited in Google AI Overview for target keywords',
          'Group named as a major brand for Busbar Trunking System in Singapore (Tai Sin Electric, LKH Projects Distribution, LKH Precicon, Tai Sin Electric VN)',
          'Rankings maintained across SG, VN, MY post-engagement',
          'Brand surfaces in AI recommendations (Google AI Mode, ChatGPT) for relevant queries'
        ] },
        { type: 'image', src: 'assets/work/taisin/serp-aioverview.jpg', alt: 'Google AI Overview citing the group as a major busbar trunking system brand in Singapore', caption: 'Google AI Overview citing the group for “busbar trunking system in singapore.”' },
        { type: 'section', title: 'Voltage Drop Calculator — Lead Generation' },
        { type: 'image', src: 'assets/work/taisin/voltage-calculator.jpg', alt: 'Busbar Trunking System Voltage Drop Calculator web tool' },
        { type: 'section', title: 'Employer Branding — CSR & Career' },
        { type: 'text', text: 'Supported the HR team with employer branding for two activities: a career landing page and a career fair. The landing page showcased company culture and openings; the fair set included brochures, posters and backdrops, with staff testimonials collected and photographed on-site.' },
        { type: 'gallery', images: [
          { src: 'assets/work/taisin/standee.jpg', alt: 'Tai Sin “We\'re more than cables” standee' },
          { src: 'assets/work/taisin/recruitment-booth.jpg', alt: 'Tai Sin internship & graduate recruitment booth backdrop' }
        ] },
        { type: 'image', src: 'assets/work/taisin/culture-page.jpg', alt: '“Life in Tai Sin” career landing page', caption: 'The “Life in Tai Sin” career landing page — culture, benefits and employee testimonials.' }
      ]
    },
    electgo: {
      index: '02', cat: 'E-commerce · SEO & Coaching', title: 'Electgo',
      img: 'assets/work/electgo/logo.jpg', heroFit: 'contain',
      intro: "A ground-up rebuild of a struggling e-commerce site's strategy — traffic from 150 to 30,000 visitors per month in just four months, plus SEO coaching for the person in charge of their marketing.",
      meta: [['Role', 'SEO & Marketing'], ['Type', 'E-commerce'], ['Timeline', '4 months']],
      tags: ['Website Audit', 'Strategy', 'KPIs', 'SEO Coaching', '200× Traffic'],
      links: [{ url: 'https://electgo.com', label: 'Visit electgo.com' }],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'Electgo, an established e-commerce site, had been online for three years but struggled with low visibility and minimal traffic — leaving its growth potential untapped.' },
        { type: 'section', title: 'What I did' },
        { type: 'list', items: [
          'Conducted a thorough website audit and identified performance-improvement opportunities',
          'Redesigned and optimised the digital marketing strategy using data-driven insights',
          'Monitored KPIs and reported website performance to management on a bi-monthly basis'
        ] },
        { type: 'section', title: 'Results' },
        { type: 'text', text: 'Monthly website traffic grew from 150 to 30,000 visitors per month in just 4 months.' },
        { type: 'image', src: 'assets/work/electgo/analytics-traffic.jpg', alt: 'Google Analytics channels report showing Electgo organic users climbing from about 150 to 30,000 per month', caption: 'Google Analytics — organic users climbing from ~150 to 30,000 per month (Jan 2019 – Oct 2021).' },
        { type: 'section', title: 'SEO Training & Coaching' },
        { type: 'text', text: 'I also coached the person in charge of their marketing in SEO — a step-by-step course taking them from the fundamentals to ranking:' },
        { type: 'list', items: [
          'Keyword research',
          'Competitor analysis',
          'Website audit',
          'On-page optimisation',
          'Content',
          'Link building',
          'Local & international SEO'
        ] },
        { type: 'image', src: 'assets/work/electgo/seo-coaching.jpg', alt: '“From ZERO to SEO HERO” SEO course structure and learning tracker', caption: 'The “From ZERO to SEO HERO” course used for the 1-on-1 coaching.' },
        { type: 'quote', text: "I highly recommend Kim's SEO courses! She is incredibly kind and patient, guiding me step by step on how to improve our SEO rankings. The lectures were detailed and easy to follow, and within just a few weeks, I was able to implement her strategies. Thanks to Kim's insights, we now rank on the first page for multiple keywords and even secured a spot in featured snippets! I'm beyond happy with the results and grateful for everything I've learned from her.", cite: 'Person in charge of marketing, Electgo' }
      ]
    },
    validag: {
      index: '03', cat: 'Brand & Web · Co-founder', title: 'Validag',
      img: 'assets/work/validag.png',
      intro: '“Proof, not promises.” A verification-tech startup I co-founded — and the “Ledger” design system I built to unify its brand, marketing site and products.',
      meta: [['Role', 'Co-founder · Brand'], ['Focus', 'Brand · Web · GEO'], ['System', 'Ledger']],
      tags: ['Branding', 'Design System', 'Web', 'GEO'],
      liveUrl: 'https://validag.com', liveLabel: 'Visit validag.com',
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'Validag turns satellites and smartphones into accountability tools. I co-founded the company and lead its brand, website and generative-engine visibility.' },
        { type: 'section', title: 'The “Ledger” design system' },
        { type: 'text', text: 'One authoritative visual language unifying the marketing site, the Carbon Integrity dashboard and the Captilo app — heavy neo-grotesque display, monospace telemetry, hairline structure, and a proof-receipt motif where the evidence itself becomes the decoration.' },
        { type: 'html', html: `<div class="validag-embed">
          <header class="vg-top"><div class="vg-lockup"><img src="assets/validag/mark-white.png" alt="Validag logo mark" class="vg-mark" /><span class="vg-name">Validag</span></div><div class="vg-eyebrow"><span class="vg-tick"></span> Proof, not promises</div></header>
          <p class="vg-kicker">Brand &amp; design system</p>
          <h3 class="vg-title">Replace trust<br />with <em>evidence.</em></h3>
          <p class="vg-lead">The evidence itself becomes the decoration — scores, hashes and timestamps set like a printed receipt.</p>
          <div class="vg-receipt">
            <div class="vg-receipt__head"><span>Impact Consistency Score</span><span class="vg-beam">Sentinel-2</span></div>
            <div class="vg-receipt__score"><span class="vg-num">87</span><span class="vg-den">/100</span><div class="vg-hash">SHA256:a3f8b2c1…e9f0<br />BLOCK:48291037 · eIDAS ✓</div></div>
            <div class="vg-bars" aria-hidden="true"><span style="height:54%"></span><span style="height:72%"></span><span style="height:46%"></span><span style="height:88%"></span><span style="height:64%"></span><span style="height:80%"></span><span style="height:58%"></span><span style="height:74%"></span></div>
          </div>
          <div class="vg-tokens"><span class="vg-tok"><i style="background:#0012ff"></i>Electric · #0012FF</span><span class="vg-tok"><i style="background:#4d68ff"></i>Beam · #4D68FF</span><span class="vg-tok"><i style="background:#10b981"></i>Verified · #10B981</span><span class="vg-tok"><i style="background:#070b14;border:1px solid rgba(255,255,255,.2)"></i>Ink · #070B14</span></div>
          <div class="vg-typeline">Archivo · Hanken Grotesk · JetBrains Mono</div>
        </div>` },
        { type: 'section', title: 'Products' },
        { type: 'list', items: [
          'Carbon Integrity — satellite-based verification for carbon-offset projects (14,000+ projects across 8 registries)',
          'Captilo — privacy-first, tamper-proof photo authentication, cryptographically sealed on-device'
        ] },
        { type: 'image', src: 'assets/work/carbonintegrity.png', alt: 'Carbon Integrity verification platform', caption: 'Carbon Integrity — Validag’s flagship verification platform.' }
      ]
    },
    topaithreats: {
      index: '04', cat: 'Brand & Web · Design + Build', title: 'Top AI Threats',
      img: 'assets/work/topaithreats/site-hero.jpg',
      intro: 'Top AI Threats — an evidence-based reference for AI-enabled threats. I took it from a blank page to a live product end to end: from the logo, through information architecture, to development (using Claude).',
      meta: [['Role', 'Design & Build'], ['Scope', 'Logo · IA · Web'], ['Built with', 'Claude']],
      tags: ['Logo', 'Information Architecture', 'Web Design', 'Development'],
      links: [{ url: 'https://topaithreats.com', label: 'Visit topaithreats.com' }],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'Top AI Threats helps people identify, assess and manage AI-enabled threats — backed by evidence. I owned the whole thing: the brand, the structure and the build.' },
        { type: 'section', title: 'Logo & Brand' },
        { type: 'text', text: 'A refined, institutional identity — a classical figure motif paired with a shield wordmark, signalling authority and trust.' },
        { type: 'image', src: 'assets/work/topaithreats/logo.jpg', alt: 'Top AI Threats logo' },
        { type: 'section', title: 'Information Architecture' },
        { type: 'text', text: 'I structured the experience around how people actually navigate risk — an evidence-first hierarchy across domains, sectors and incidents.' },
        { type: 'list', items: [
          'Threat domains — agentic, human-control, economic, information integrity, privacy, security, discrimination and systemic risks',
          'Explore by sector — technology, corporate, government, finance, healthcare, law enforcement and education',
          'A continuously updated incident database',
          'Methodology and reference sections'
        ] },
        { type: 'section', title: 'Website' },
        { type: 'text', text: 'Designed and developed the site using Claude — a fast, evidence-led build.' },
        { type: 'image', src: 'assets/work/topaithreats/site-full.jpg', alt: 'Top AI Threats website — full homepage', caption: 'The Top AI Threats homepage — topaithreats.com.' }
      ]
    },
    branchcable: {
      index: '05', cat: 'Industrial · Brand, Web & SEO', title: 'Branch Cable System',
      img: 'assets/work/branchcable/3d-modeling.jpg', heroFit: 'contain',
      intro: "Built entirely from scratch — landing page, brand collateral, 3D product visuals and the on-page SEO that took Tai Sin's prefabricated branch cable to #1 on Google.",
      meta: [['Role', 'Brand · Web · SEO'], ['Client', 'Tai Sin'], ['Built', 'From scratch']],
      tags: ['From Scratch', '3D', 'Design', 'SEO', '#1 Rankings'],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: "Tai Sin's prefabricated branch cable line needed a complete market presence from zero — no product page, no content, no collateral and no search rankings. I built all of it from scratch." },
        { type: 'section', title: 'Built from scratch' },
        { type: 'list', items: [
          'The product landing page — design and copy, end to end',
          'Brand & marketing collateral — brochures, posters and campaign visuals',
          '3D product modelling and visualization for a physical product',
          'Full on-page SEO, content and keyword strategy from the ground up'
        ] },
        { type: 'section', title: 'Landing Page & Collateral' },
        { type: 'text', text: 'A dedicated product landing page, plus a full set of brand collateral — brochures, posters and campaign visuals — all designed and written from scratch.' },
        { type: 'image', src: 'assets/work/branchcable/landing-page.jpg', alt: 'Branch Cable System product landing page design', caption: 'The product landing page — designed and written from scratch.' },
        { type: 'gallery', images: [
          { src: 'assets/work/branchcable/brochure-blue.jpg', alt: 'Branch cable brochure design' },
          { src: 'assets/work/branchcable/brochure-electrical.jpg', alt: 'Electrical brochure design' },
          { src: 'assets/work/branchcable/poster.jpg', alt: 'Branch cable poster design' },
          { src: 'assets/work/branchcable/shopping-mall.jpg', alt: 'Branch cable in a shopping mall — campaign visual' }
        ] },
        { type: 'section', title: '3D Product Visualization' },
        { type: 'text', text: 'Modelled and rendered the prefabricated branch cable in 3D — shown above and used across the landing page, catalogs and campaign visuals — with no physical photography required.' },
        { type: 'section', title: 'SEO — #1 on Google' },
        { type: 'text', text: 'With the page and content built from zero, on-page SEO took the line to the top of Google for its core commercial keywords across Singapore.' },
        { type: 'image', src: 'assets/work/branchcable/keyword-rankings.jpg', alt: 'Keyword ranking tracker showing #1 positions for branch cable keywords', caption: '#1 for “branch cable” and “branch cable supplier”, with top-3 positions across the prefabricated-cable keyword set (Jan 2024).' }
      ]
    },
    lightjourney: {
      index: '06', cat: 'Brand Identity · SEO', title: 'Light Journey',
      img: 'assets/work/lightjourney/logo.jpg', heroFit: 'contain', heroBg: '#050505',
      intro: 'A full brand identity for Light Journey, an architectural lighting supplier — logo, brochures, name cards, an e-book and a corporate deck — plus the search foundation behind the launch.',
      meta: [['Role', 'Brand & Design'], ['Sector', 'Architectural Lighting'], ['Year', '2020']],
      tags: ['Branding', 'Identity', 'Collateral', 'Web', 'SEO'],
      links: [{ url: 'https://lightjourney.com.sg', label: 'Visit lightjourney.com.sg' }],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'Light Journey, an architectural lighting supplier, was launching and needed a complete brand identity — and to be found by high-intent buyers and specifiers. Their philosophy: “Passion inspires creativity.”' },
        { type: 'section', title: 'Brand Identity' },
        { type: 'text', text: 'I designed the logo and visual identity from scratch — a constructed “LJ” mark built on a precise geometric grid, paired with the line “Passion inspires creativity”.' },
        { type: 'section', title: 'Collateral' },
        { type: 'text', text: 'A full collateral system rolled out across the brand — brochures, name cards, an e-book and a corporate presentation.' },
        { type: 'gallery', images: [
          { src: 'assets/work/lightjourney/brochure.jpg', alt: 'Light Journey brochure design' },
          { src: 'assets/work/lightjourney/corporate-presentation.jpg', alt: 'Light Journey corporate presentation design' },
          { src: 'assets/work/lightjourney/ebook.jpg', alt: 'Light Journey e-book mockup on phone' },
          { src: 'assets/work/lightjourney/name-card.jpg', alt: 'Light Journey name card design' },
          { src: 'assets/work/lightjourney/name-card-black.jpg', alt: 'Light Journey black name card design' }
        ] },
        { type: 'section', title: 'Website & SEO' },
        { type: 'text', text: 'I led the brand and content direction and worked with a vendor to develop the website, then built the SEO foundation behind the launch.' },
        { type: 'section', title: 'Results' },
        { type: 'text', text: '~30k monthly organic reach and qualified inquiries up to S$300k each — with zero paid spend.' }
      ]
    },
    pdnet: {
      index: '07', cat: 'B2B Brand · Collateral', title: 'PDnet',
      img: 'assets/work/pdnet/brochure.jpg',
      intro: "Brand collateral for PDnet — I partnered with a freelance designer on the logo, then built the full marketing toolkit around it: brochures, catalog, packaging and a presentation.",
      meta: [['Role', 'Brand & Design'], ['Client', 'PDnet'], ['Built with', 'Illustrator · InDesign']],
      tags: ['Branding', 'Collateral', 'Packaging', 'Print'],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'PDnet needed a complete B2B marketing toolkit. I worked with a freelance designer on the logo, then built every piece of collateral around it — a consistent system anchored on a dynamic, flexible, future-proof identity.' },
        { type: 'section', title: 'What I built' },
        { type: 'list', items: [
          'Brochures — outside and inside spreads',
          'Product catalog',
          'Packaging design',
          'Sales presentation',
          'Animated email signature'
        ] },
        { type: 'section', title: 'Email Signature' },
        { type: 'video', src: 'assets/work/pdnet/email-signature.mp4', caption: 'Animated email signature — a small piece of motion to extend the brand.' },
        { type: 'section', title: 'Brochure & Catalog' },
        { type: 'gallery', images: [
          { src: 'assets/work/pdnet/brochure.jpg', alt: 'PDnet brochure design' },
          { src: 'assets/work/pdnet/brochure-outside.jpg', alt: 'PDnet brochure — outside spread' },
          { src: 'assets/work/pdnet/catalog.jpg', alt: 'PDnet product catalog design' }
        ] },
        { type: 'section', title: 'Packaging' },
        { type: 'gallery', images: [
          { src: 'assets/work/pdnet/packaging.jpg', alt: 'PDnet packaging design' },
          { src: 'assets/work/pdnet/packaging-details.jpg', alt: 'PDnet packaging design — details' }
        ] },
        { type: 'section', title: 'Presentation' },
        { type: 'image', src: 'assets/work/pdnet/presentation.jpg', alt: 'PDnet sales presentation design' }
      ]
    },
    lkhpd: {
      index: '08', cat: 'B2B Marketing · Brand & Web', title: 'LKH Projects Distribution',
      img: 'assets/work/lkhpd/brochure.jpg',
      intro: 'A full marketing transformation for LKH Projects Distribution — I revamped the entire website with an agency and built the marketing engine from scratch: funnel, channels, video, events, collateral and SEO.',
      meta: [['Role', 'Marketing Lead'], ['Client', 'LKH Projects Distribution'], ['Scope', 'Web · Funnel · SEO']],
      tags: ['Web Revamp', 'Marketing Funnel', 'Video', 'SEO', 'Collateral'],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'LKH Projects Distribution (LKHPD) needed its marketing rebuilt end to end. I led the transformation — revamping the entire website with an agency and standing up the marketing engine from scratch.' },
        { type: 'section', title: 'What I built' },
        { type: 'list', items: [
          'Revamped the entire website — together with an agency',
          'Built the full marketing funnel from scratch',
          'Launched new marketing channels from zero',
          'Produced videos and ran events',
          'Created marketing collateral — company profile, project files and presentations',
          'On-page SEO across the site'
        ] },
        { type: 'section', title: 'Marketing Collateral' },
        { type: 'text', text: 'Company profile, corporate brochure and presentation decks — a consistent system across the brand.' },
        { type: 'gallery', images: [
          { src: 'assets/work/lkhpd/company-profile.jpg', alt: 'LKHPD company profile design' },
          { src: 'assets/work/lkhpd/brochure.jpg', alt: 'LKHPD corporate brochure design' },
          { src: 'assets/work/lkhpd/slides.jpg', alt: 'LKHPD corporate presentation slide design' }
        ] }
      ]
    },
    networking: {
      index: '09', cat: 'Event · End-to-end', title: 'Networking Event',
      img: 'assets/work/networking/photo2.jpg', heroFit: 'natural',
      intro: 'An infrastructure networking event for LKH Projects Distribution, which I orchestrated end to end — from venue and invitations to a fully digital registration, check-in and feedback experience.',
      meta: [['Role', 'Event Lead'], ['Client', 'LKHPD'], ['Result', '60%+ rated Excellent']],
      tags: ['Events', 'Digital Check-in', 'End-to-end'],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'I orchestrated an infrastructure networking event for LKH Projects Distribution end to end — owning the full event lifecycle, from concept and venue through to the on-the-day experience.' },
        { type: 'section', title: 'Scope' },
        { type: 'list', items: [
          'Venue sourcing and selection',
          'Invitation design and guest management',
          'A fully digital experience — online registration, on-site check-in and post-event feedback',
          'On-site setup and event-day management'
        ] },
        { type: 'image', src: 'assets/work/networking/register-website.jpg', alt: 'LKHPD Networking Event registration website', caption: 'The event microsite — invitation, online registration and check-in.' },
        { type: 'button', url: 'https://marketing93196.wixsite.com/lkhpd', label: 'Visit the event site' },
        { type: 'section', title: 'On the day' },
        { type: 'gallery', images: [
          { src: 'assets/work/networking/hero.jpg', alt: 'Networking event — welcome and digital registration desk' },
          { src: 'assets/work/networking/photo1.jpg', alt: 'Networking event — guests networking' },
          { src: 'assets/work/networking/photo3.jpg', alt: 'Networking event — attendee moment' }
        ] },
        { type: 'video', src: 'assets/work/networking/event-video.mp4', caption: 'Highlights from the event.', portrait: true },
        { type: 'section', title: 'Result' },
        { type: 'text', text: 'Over 60% of attendees rated their experience “Excellent”.' }
      ]
    },
    groupsite: {
      index: '10', cat: 'Corporate Web · Design', title: 'Tai Sin Group Website',
      img: 'assets/work/groupsite/hero.jpg',
      intro: 'The Tai Sin Group corporate website — I co-designed it with a team member, then worked with development vendors to build and launch it.',
      meta: [['Role', 'Web Design'], ['Client', 'Tai Sin Group'], ['Scope', 'Design → Build']],
      tags: ['Web Design', 'Corporate', 'Vendor Build'],
      links: [{ url: 'https://www.taisinelectric.com', label: 'Visit taisinelectric.com' }],
      blocks: [
        { type: 'section', title: 'Overview' },
        { type: 'text', text: 'The Tai Sin Group needed a corporate website that reflected the scale of the group. I designed it together with a team member, then worked with development vendors to build and ship it.' },
        { type: 'section', title: 'What I did' },
        { type: 'list', items: [
          'Designed the group website alongside a fellow team member',
          'Defined the structure, content and visual direction',
          'Worked with development vendors to build and launch the site'
        ] },
        { type: 'section', title: 'The site' },
        { type: 'image', src: 'assets/work/groupsite/full.jpg', alt: 'Tai Sin Group corporate website — full homepage', caption: 'The Tai Sin Group homepage — taisinelectric.com.' }
      ]
    },
    render3d: {
      index: '11', cat: '3D Modeling · Rendering', title: '3D Product Visualization',
      img: 'assets/work/render3d.jpg',
      intro: 'Photoreal 3D product modeling and rendering, produced through a curated freelance network.',
      meta: [['Role', 'Art Direction'], ['Discipline', '3D · Rendering'], ['Network', 'Freelance']],
      challenge: 'Products need photoreal imagery for marketing and e-commerce without the cost and constraints of physical photo shoots.',
      approach: ['Art-directed photoreal 3D product models', 'Coordinated delivery through a curated freelance network', 'Rendered marketing- and store-ready visuals'],
      outcome: 'Flexible, photoreal product imagery delivered without a physical studio.',
      tags: ['3D', 'Rendering', 'Product']
    }
  };
  const PROJECT_ORDER = ['taisin', 'electgo', 'validag', 'topaithreats', 'branchcable', 'lightjourney', 'pdnet', 'lkhpd', 'networking', 'groupsite', 'render3d'];

  function initCaseStudies() {
    const modal = document.getElementById('case');
    if (!modal) return;
    const scroll = document.getElementById('caseScroll');
    const els = {
      index: document.getElementById('caseIndex'), cat: document.getElementById('caseCat'),
      title: document.getElementById('caseTitle'), intro: document.getElementById('caseIntro'),
      meta: document.getElementById('caseMeta'), img: document.getElementById('caseImg'),
      body: document.getElementById('caseBody'), cta: document.getElementById('caseCta')
    };
    let current = null, lastFocus = null;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Rich long-form layout for projects that define a `blocks` array.
    function blocksHTML(blocks) {
      return blocks.map((b) => {
        if (b.type === 'section') return `<h4 class="case__sec">${esc(b.title)}</h4>`;
        if (b.type === 'subhead') return `<p class="case__subhead">${esc(b.text)}</p>`;
        if (b.type === 'text') return `<p>${esc(b.text)}</p>`;
        if (b.type === 'list') return `<ul>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
        if (b.type === 'quote') return `<blockquote class="case__quote"><p>${esc(b.text)}</p>${b.cite ? `<cite>— ${esc(b.cite)}</cite>` : ''}</blockquote>`;
        if (b.type === 'html') return b.html; // trusted, author-authored markup (e.g. the Validag Ledger showcase)
        if (b.type === 'image') return `<figure class="case__fig"><img loading="lazy" src="${b.src}" alt="${esc(b.alt || '')}" />${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
        if (b.type === 'video') return `<figure class="case__fig${b.portrait ? ' case__fig--portrait' : ''}"><video src="${b.src}" autoplay muted loop playsinline controls preload="metadata"></video>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
        if (b.type === 'button') return `<div class="case__btnrow"><a class="case__visit" href="${b.url}" target="_blank" rel="noopener" data-cursor="Visit">${esc(b.label || 'Visit site')} ↗</a></div>`;
        if (b.type === 'gallery') return `<div class="case__gallery" data-n="${b.images.length}">${b.images.map(im => `<figure class="case__gfig"><img loading="lazy" src="${im.src}" alt="${esc(im.alt || '')}" /></figure>`).join('')}</div>`;
        return '';
      }).join('');
    }

    function render(id) {
      const p = PROJECTS[id];
      if (!p) return;
      current = id;
      els.index.textContent = p.index;
      els.cat.textContent = p.cat;
      els.title.textContent = p.title;
      els.intro.textContent = p.intro;
      els.img.src = p.img; els.img.alt = p.title;
      els.img.parentElement.classList.toggle('case__media--contain', p.heroFit === 'contain');
      els.img.parentElement.classList.toggle('case__media--natural', p.heroFit === 'natural');
      els.img.parentElement.style.background = p.heroBg || '';
      els.img.style.objectPosition = p.heroPosition || '';
      els.meta.innerHTML = p.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
      els.body.innerHTML =
        (p.blocks
          ? blocksHTML(p.blocks)
          : `<h4>The challenge</h4><p>${esc(p.challenge)}</p>` +
            `<h4>What I did</h4><ul>${p.approach.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` +
            `<h4>Outcome</h4><p>${esc(p.outcome)}</p>`) +
        `<div class="case__tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>`;
      // next project + optional live link(s) — supports a `links` array or a single liveUrl
      const nextId = PROJECT_ORDER[(PROJECT_ORDER.indexOf(id) + 1) % PROJECT_ORDER.length];
      const links = p.links || (p.liveUrl ? [{ url: p.liveUrl, label: p.liveLabel }] : []);
      let cta = links.map(l => `<a class="case__visit" href="${l.url}" target="_blank" rel="noopener" data-cursor="Visit">${esc(l.label || 'Visit live site')} ↗</a>`).join('');
      cta += `<button class="case__next" type="button" data-next="${nextId}" data-cursor="Next">Next project →</button>`;
      els.cta.innerHTML = cta;
      els.cta.querySelector('[data-next]').addEventListener('click', () => open(nextId));
    }

    function open(id) {
      if (!PROJECTS[id]) return;
      lastFocus = document.activeElement;
      render(id);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('case-open');
      if (lenis) lenis.stop();
      if (scroll) scroll.scrollTop = 0;
      modal.querySelector('.case__close')?.focus();
    }
    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('case-open');
      if (lenis) lenis.start();
      current = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Open from project cards
    document.querySelectorAll('[data-project][data-id]').forEach((card) => {
      const id = card.dataset.id;
      card.querySelector('.project__media')?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); open(id);
      });
      // title is also a handy click target
      card.querySelector('.project__info h3')?.addEventListener('click', () => open(id));
    });

    modal.querySelectorAll('[data-case-close]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) close(); });
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function initVantaHero() {
    const el = document.getElementById('hero-bg');
    if (!el) return;
    if (prefersReduced || typeof VANTA === 'undefined' || !VANTA.BIRDS) return; // graceful fallback to the CSS bg
    try {
      window._vantaHero = VANTA.BIRDS({
        el: el,
        mouseControls: true, touchControls: true, gyroControls: false,
        minHeight: 200.0, minWidth: 200.0, scale: 1.0, scaleMobile: 1.0,
        backgroundColor: 0x0d0a18,
        color1: 0x6900ff,
        color2: 0x8d4ffe,
        birdSize: 1.1, wingSpan: 26.0, speedLimit: 4.0,
        separation: 28.0, alignment: 22.0, cohesion: 22.0, quantity: 3.0
      });
    } catch (e) { /* leave the CSS fallback background in place */ }
  }

  function boot() {
    window.scrollTo(0, 0);
    initVantaHero();
    initScroll();
    initCursor();
    initServices();
    initProcess();
    initWorkMore();
    initCaseStudies();
    initMarquee();
    runLoader(() => {
      initReveal();
      initCounters();
      initNav();
      initFormSuccess();
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });
  }

  // After a successful FormSubmit POST the visitor is redirected back with ?sent=1 —
  // swap the form for a thank-you note and bring them to it.
  function initFormSuccess() {
    if (new URLSearchParams(location.search).get('sent') !== '1') return;
    const sent = document.getElementById('cformSent');
    const form = document.getElementById('projectForm');
    if (sent) sent.hidden = false;
    if (form) form.style.display = 'none';
    const target = document.getElementById('contact');
    if (target) setTimeout(() => { lenis ? lenis.scrollTo(target, { offset: -10 }) : target.scrollIntoView(); }, 200);
  }
  // Run boot whether or not DOMContentLoaded has already fired (avoids a stuck
  // loader when this script evaluates after the event, e.g. on some reloads).
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

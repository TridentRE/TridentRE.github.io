// Initialize Parallax Depth (Option 3)
function initParallax() {
    const items = document.querySelectorAll('.parallax-bg');
    const mobileHub = document.querySelector('.mobile-hub');
    const hero = document.getElementById('hero-runway');
    if (items.length === 0 && !mobileHub) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        // Parallax Logic
        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const speed = 0.15;
                const yPos = -(scrolled * speed);
                item.style.backgroundPositionY = `calc(50% + ${yPos}px)`;
            }
        });

        // Mobile Hub Visibility Logic (Option 1)
        if (mobileHub && hero) {
            const heroBottom = hero.offsetTop + hero.offsetHeight;
            if (scrolled > heroBottom - 500) { // Appear slightly before hero ends
                mobileHub.classList.add('visible');
            } else {
                mobileHub.classList.remove('visible');
            }
        }
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
    initHeroAnimation();
    initEmergencyMode();
    initPortfolioCarousel();
    initRoofQuiz();
    initRevealAnimations();
    initServiceModals();
    initMobileNav();
    initParallax();
    initAboutCounter();
    initTridentEdge();
    initCustomDropdown();
    initMagneticButtons();
    initBlueprintHotspots();
});

/**
 * Scroll-Hijacked Cinematic Hero Animation
 * Pins the hero viewport and crossfades through 5 illustration frames
 * based on scroll progress through a 500vh tall "runway" section.
 */
function initHeroAnimation() {
    const runway = document.getElementById('hero-runway');
    if (!runway) return;

    const frames = document.querySelectorAll('.hero-frame');
    const phases = document.querySelectorAll('.hero-phase');
    const dots = document.querySelectorAll('.phase-dot');
    const progressBar = document.getElementById('hero-progress-bar');
    const scrollHint = document.getElementById('scroll-hint');
    const totalPhases = frames.length;
    
    let lastPhase = -1;


    function updateHero() {
        const rect = runway.getBoundingClientRect();
        const runwayHeight = runway.offsetHeight;
        const viewportHeight = window.innerHeight;
        
        // How far we've scrolled into the runway (0 to 1)
        const scrolled = -rect.top;
        const maxScroll = runwayHeight - viewportHeight;
        const progress = Math.max(0, Math.min(1, scrolled / maxScroll));
        
        // Map progress to phase (1-indexed)
        const currentPhase = Math.min(totalPhases, Math.floor(progress * totalPhases) + 1);
        
        // Update progress bar
        if (progressBar) {
            progressBar.style.height = `${progress * 100}%`;
        }
        
        // Never hide scroll hint as per user request for persistence
        if (scrollHint) {
            scrollHint.classList.toggle('hidden', false);
        }
        
        // Only update DOM if phase changed
        if (currentPhase !== lastPhase) {
            lastPhase = currentPhase;
            
            // Crossfade frames
            frames.forEach(f => {
                const frameNum = parseInt(f.dataset.frame);
                f.classList.toggle('active', frameNum === currentPhase);
            });
            
            // Switch text phases
            phases.forEach(p => {
                const phaseNum = parseInt(p.dataset.phase);
                p.classList.toggle('active', phaseNum === currentPhase);
            });
            
            // Update dots
            dots.forEach(d => {
                const dotNum = parseInt(d.dataset.dot);
                d.classList.toggle('active', dotNum === currentPhase);
            });
        }
        
        requestAnimationFrame(updateHero);
    }
    
    requestAnimationFrame(updateHero);
}


/**
 * REVEAL ANIMATIONS
 * Standard fade-in-up animations for sections and elements.
 * Supports .reveal-group for staggered children.
 */
function initRevealAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // If it's a group, reveal all children with stagger
                if (entry.target.classList.contains('reveal-group')) {
                    const children = entry.target.querySelectorAll('.reveal');
                    children.forEach((child, index) => {
                        child.style.setProperty('--stagger-index', index);
                        child.classList.add('active');
                    });
                } else {
                    entry.target.classList.add('active');
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Track standard reveals and groups
    document.querySelectorAll('.reveal, .reveal-group').forEach(el => observer.observe(el));
}

/**
 * Emergency Mode Toggle
 */
function initEmergencyMode() {
    const toggle = document.getElementById('emergency-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('emergency-mode');
        const isEmergency = document.body.classList.contains('emergency-mode');
        toggle.innerHTML = isEmergency ? '<i class="fas fa-times"></i> EXIT EMERGENCY' : '<i class="fas fa-bolt"></i> EMERGENCY MODE';
        
        if (isEmergency) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

/**
 * Portfolio Carousel & Before/After Multi-Slider Logic
 */
function initPortfolioCarousel() {
    const carousel = document.querySelector('.portfolio-carousel');
    if (!carousel) return;

    const slides = carousel.querySelectorAll('.portfolio-slide');
    const dots = carousel.querySelectorAll('.dot');
    const prevBtn = document.getElementById('portfolio-prev');
    const nextBtn = document.getElementById('portfolio-next');
    let currentSlide = 0;

    const showSlide = (index) => {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
            dots[i].classList.toggle('active', i === index);
        });
        currentSlide = index;
        
        // Re-calculate layout for the active slider when shown
        const activeSlider = slides[index].querySelector('.slider-container');
        if (activeSlider) {
            // Trigger a resize-like event or just ensure pins/handle are reset if needed
        }
    };

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            let next = currentSlide + 1;
            if (next >= slides.length) next = 0;
            showSlide(next);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            let prev = currentSlide - 1;
            if (prev < 0) prev = slides.length - 1;
            showSlide(prev);
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });

    // Initialize all before/after sliders
    const sliders = document.querySelectorAll('.slider-container');
    sliders.forEach(slider => {
        const afterImg = slider.querySelector('.img-after');
        const handle = slider.querySelector('.slider-handle');
        const slideWrapper = slider.closest('.portfolio-slide');
        const pins = slideWrapper.querySelectorAll('.p-pin');
        let isDragging = false;
        let animationFrameId = null;

        const updatePins = (percent) => {
            pins.forEach(pin => {
                const pinX = parseFloat(pin.getAttribute('data-x'));
                if (pinX < percent) {
                    pin.classList.add('is-success');
                } else {
                    pin.classList.remove('is-success');
                }
            });
        };

        const moveSlider = (clientX) => {
            const rect = slider.getBoundingClientRect();
            let x = clientX - rect.left - window.scrollX;
            if (x < 0) x = 0;
            if (x > rect.width) x = rect.width;
            const percent = (x / rect.width) * 100;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => {
                afterImg.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
                handle.style.left = `${percent}%`;
                updatePins(percent);
            });
        };

        slider.addEventListener('mousedown', (e) => { e.preventDefault(); isDragging = true; });
        window.addEventListener('mouseup', () => { isDragging = false; });
        window.addEventListener('mousemove', (e) => { if (isDragging) moveSlider(e.clientX); });
        
        slider.addEventListener('touchstart', (e) => { isDragging = true; }, { passive: true });
        window.addEventListener('touchend', () => { isDragging = false; });
        window.addEventListener('touchmove', (e) => { if (isDragging) moveSlider(e.touches[0].clientX); }, { passive: true });

        // Initial state: 50%
        afterImg.style.clipPath = `inset(0 50% 0 0)`;
        handle.style.left = `50%`;
        updatePins(50);
    });

    // Mobile "Learn More" logic for all slides
    const moreBtns = document.querySelectorAll('.portfolio-more-btn');
    const modal = document.getElementById('portfolio-modal');
    const modalClose = document.getElementById('portfolio-modal-close');
    const modalBody = modal?.querySelector('.modal-body');

    if (moreBtns && modal) {
        moreBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const slide = slides[index];
                const title = slide.querySelector('h3').innerText;
                const subtitle = slide.querySelector('.text-accent').innerText;
                const desc = slide.querySelector('.mb-md').innerText;
                const features = slide.querySelector('.feature-list').innerHTML;

                if (modalBody) {
                    modalBody.querySelector('h2').innerText = title;
                    modalBody.querySelector('.text-accent').innerText = subtitle;
                    modalBody.querySelector('p:not(.text-accent)').innerText = desc;
                    modalBody.querySelector('.feature-list').innerHTML = features;
                }
                modal.classList.add('active');
            });
        });

        modalClose.addEventListener('click', () => modal.classList.remove('active'));
    }
}

/**
 * Instant Estimate Tool Logic (Fixed Selector)
 */
function initEstimateTool() {
    const tool = document.getElementById('estimate-tool');
    if (!tool) return;

    const options = tool.querySelectorAll('.option-card');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultBox = document.getElementById('estimate-result');
    const sizeInput = document.getElementById('roof-size');
    
    let selectedType = null;

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            // Remove active from others
            options.forEach(o => o.classList.remove('active-option'));
            opt.classList.add('active-option');
            selectedType = opt.dataset.value;
            
            // Move to step 2
            tool.querySelector('[data-step="1"]').classList.remove('active');
            tool.querySelector('[data-step="2"]').classList.add('active');
        });
    });

    calculateBtn.addEventListener('click', () => {
        const size = parseFloat(sizeInput.value);
        if (!size || !selectedType) return;

        let minRate, maxRate;
        if (selectedType === 'asphalt') { minRate = 6; maxRate = 9; }
        else if (selectedType === 'flat') { minRate = 12; maxRate = 18; }
        else { minRate = 15; maxRate = 25; }

        const min = Math.floor(size * minRate);
        const max = Math.floor(size * maxRate);

        // Count-up animation (Option 2)
        const animateVal = (id, start, end, duration) => {
            const obj = document.getElementById(id);
            if (!obj) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const value = Math.floor(progress * (end - start) + start);
                obj.innerHTML = value.toLocaleString();
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        };

        tool.querySelector('[data-step="2"]').classList.remove('active');
        tool.querySelector('[data-step="3"]').classList.add('active');

        animateVal('min-val', 0, min, 1500);
        animateVal('max-val', 0, max, 1500);
    });
}

/**
 * Roof Health Quiz Logic
 */
function initRoofQuiz() {
    const quiz = document.getElementById('roof-quiz');
    if (!quiz) return;

    const steps = quiz.querySelectorAll('.step');
    const options = quiz.querySelectorAll('.option-card');
    const resultTitle = document.getElementById('quiz-result');
    const resultAdvice = document.getElementById('quiz-advice');
    
    let totalScore = 0;
    let currentStep = 1;

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const points = parseInt(opt.dataset.points);
            totalScore += points;
            
            if (currentStep < steps.length - 1) {
                quiz.querySelector(`[data-quiz-step="${currentStep}"]`).classList.remove('active');
                currentStep++;
                quiz.querySelector(`[data-quiz-step="${currentStep}"]`).classList.add('active');
            } else {
                quiz.querySelector(`[data-quiz-step="${currentStep}"]`).classList.remove('active');
                quiz.querySelector(`[data-quiz-step="4"]`).classList.add('active');
                displayQuizResult(totalScore);
            }
        });
    });

    function displayQuizResult(score) {
        let title, advice;
        if (score <= 2) {
            title = "Score: 90% (Excellent)";
            advice = "Your roof is in great shape. We recommend a proactive inspection in 24 months.";
        } else if (score <= 8) {
            title = "Score: 65% (Warning)";
            advice = "Moderate wear detected. Book an inspection within 30 days.";
        } else {
            title = "Score: 25% (CRITICAL)";
            advice = "High risk of failure. Book an urgent audit immediately.";
        }
    }
}

/**
 * Service Modals Logic
 */
function initServiceModals() {
    const modal = document.getElementById('service-modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.getElementById('modal-close');
    const triggers = document.querySelectorAll('.service-modal-trigger');

    const serviceData = {
        'roofing': {
            title: 'Advanced Roofing Systems',
            subtitle: 'Engineered for Ontario\'s Extremes',
            description: 'Our roofing systems go beyond simple shingle replacement. We engineer a multi-layered shield designed to withstand heavy snow loads, high winds, and rapid freeze-thaw cycles.',
            features: [
                'Full Tear-Off: We strip to the deck to inspect for rot.',
                'Ice & Water Shield: Critical protection for valleys and eaves.',
                'Synthetic Underlayment: High-performance moisture barrier.',
                'Certified Installation: Backed by manufacturer warranties.',
                'Canadian-Sourced: Using IKO and Westlake Royal materials.'
            ],
            cta: 'Schedule a Roofing Consultation'
        },
        'siding': {
            title: 'Premium Cladding Systems',
            subtitle: 'Thermal Performance & Curb Appeal',
            description: 'Westlake Royal certified siding systems that provide superior insulation and moisture management while completely transforming your home\'s aesthetic.',
            features: [
                'Rigid Foam Backing: Improved R-value and impact resistance.',
                'Advanced House Wrap: Prevents trapped moisture and rot.',
                'Precision Trim Work: Clean corners and architectural details.',
                'Fade-Resistant Colors: UV-stable technology.',
                'Low Maintenance: Never paint your home again.'
            ],
            cta: 'Schedule a Siding Consultation'
        },
        'eavestroughs': {
            title: 'Seamless Water Management',
            subtitle: 'Foundation Protection',
            description: 'Our seamless aluminum eavestroughs combined with Alu-Rex leaf protection systems provide a perfect fit and eliminate leak-prone joints and clogs.',
            features: [
                'Heavy-Duty Aluminum: Resists denting and sagging.',
                'Alu-Rex Guards: Keeps leaves, needles, and debris out.',
                'Structural Reinforcement: Protects gutters from snow/ice weight.',
                'Custom Mitres: Hand-cut corners for a leak-proof finish.',
                'Optimized Downspouts: Channelling water away from foundation.'
            ],
            cta: 'Schedule an Eavestrough Consultation'
        },
        'skylights': {
            title: 'Skylights & Sun Tunnels',
            subtitle: 'Natural Light, Zero Leaks',
            description: 'Professional installation of Velux skylights and sun tunnels. We ensure a perfect, leak-free integration with your roofing system.',
            features: [
                'Velux Certified: Installed to exact manufacturer specs.',
                'Energy Efficient: Premium glass coatings reduce heat transfer.',
                'Leak-Free Guarantee: Advanced flashing systems ensure watertight seals.',
                'Natural Light: Drastically transform dark spaces.',
                'Ventilation Options: Available in manual or solar-powered venting models.'
            ],
            cta: 'Schedule a Skylight Consultation'
        },
        'specialty': {
            title: 'Custom Exterior Solutions',
            subtitle: 'Comprehensive Protection',
            description: 'Beyond standard systems, we offer specialized upgrades to perfect your home\'s exterior performance and aesthetic.',
            features: [
                'Blown-In Insulation: Maximize attic thermal efficiency.',
                'Custom Metal Capping: Protect wood fascia and trim with precision metal.',
                'Technical Flashing: Custom bent lead and aluminum for complex roof transitions.',
                'Heating Cables: Prevent ice dams in problem areas.',
                'Seasonal Accents: Professional holiday lighting installation.'
            ],
            cta: 'Schedule a Custom Solutions Consultation'
        },
        'emergency': {
            title: 'Storm Response & Insurance',
            subtitle: '24/7 Protection & Claim Assistance',
            description: 'Active leak or storm damage? We provide 24/7 emergency mitigation and full insurance claim assistance to ensure you are fully covered and stress-free.',
            features: [
                '24/7 Dispatch: Rapid response to prevent interior damage.',
                'Temporary Tarping: Secure your roof immediately.',
                'Comprehensive Inspection: Full documentation of storm damage.',
                'Claim Assistance: We work directly with your adjuster.',
                'Restoration: Full system replacement approved by insurance.'
            ],
            cta: 'Get Immediate Assistance'
        }
    };

    triggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const service = trigger.dataset.service;
            const data = serviceData[service];
            if (!data) return;

            modalBody.innerHTML = `
                <div class="modal-subtitle">${data.subtitle}</div>
                <h2>${data.title}</h2>
                <p>${data.description}</p>
                <ul>
                    ${data.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}
                </ul>
                <a href="contact.html" class="btn btn-primary modal-cta" id="modal-cta-btn">${data.cta}</a>
            `;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Close modal when CTA is clicked
            document.getElementById('modal-cta-btn').addEventListener('click', () => {
                closeModal();
            });
        });
    });

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

/**
 * CINEMATIC MICRO-INTERACTIONS
 * Implements mouse-tracking spotlight and 3D tilt for multiple card types
 */
function initCinematicInteractions() {
    // Target all premium interactive cards
    const cards = document.querySelectorAll('.service-card-premium, .logo-showcase-card, .contact-info-panel, .contact-form-panel');
    
    cards.forEach(card => {
        // 1. Inject the spotlight element if it doesn't exist
        if (!card.querySelector('.card-spotlight')) {
            const spotlight = document.createElement('div');
            spotlight.className = 'card-spotlight';
            card.prepend(spotlight);
        }

        // 2. Track mouse movement
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Update CSS variables for the spotlight position
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            // 3. Calculate 3D Tilt
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Subtle rotation (max ~3-4 degrees)
            const rotateX = (y - centerY) / 25;
            const rotateY = (centerX - x) / 25;

            card.style.transform = `translateY(-12px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        // 4. Reset on leave
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg)';
        });
    });
}

/**
 * Portfolio Detail Modal Logic (Mobile)
 */
function initPortfolioModal() {
    const modal = document.getElementById('portfolio-modal');
    const openBtn = document.getElementById('portfolio-more-btn');
    const closeBtn = document.getElementById('portfolio-modal-close');

    if (!modal || !openBtn || !closeBtn) return;

    openBtn.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

/**
 * Mobile Navigation Toggle
 */
function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.querySelector('.desktop-nav');
    const links = document.querySelectorAll('.nav-link');

    if (!hamburger || !nav) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        nav.classList.toggle('active');
    });

    // Close menu when clicking links
    links.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            nav.classList.remove('active');
        });
    });
}

/**
 * Initialize About Counter (Option - Dynamic Experience)
 */
function initAboutCounter() {
    const counter = document.getElementById('exp-counter');
    if (!counter) return;

    const target = parseInt(counter.dataset.target);
    let started = false;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !started) {
                started = true;
                
                let startTimestamp = null;
                const duration = 2000;
                const step = (timestamp) => {
                    if (!startTimestamp) startTimestamp = timestamp;
                    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                    counter.innerHTML = Math.floor(progress * target);
                    if (progress < 1) {
                        window.requestAnimationFrame(step);
                    }
                };
                window.requestAnimationFrame(step);
            }
        });
    }, { threshold: 0.1 });

    observer.observe(counter);
}

/**
 * Magnetic Buttons (Option 1 - Desktop Only)
 */
function initMagneticButtons() {
    if (window.innerWidth < 992) return; // Desktop only

    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .floating-cta');
    
    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            // Subtle magnetic pull
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px) scale(1.05)`;
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}



/**
 * Trident Edge Click Details
 */
function initTridentEdge() {
    const items = document.querySelectorAll('.clickable-edge');
    const modal = document.getElementById('service-modal');
    const modalBody = document.getElementById('modal-body');
    
    items.forEach(item => {
        item.addEventListener('click', () => {
            const detail = item.getAttribute('data-detail');
            const title = item.querySelector('span').innerText;
            if(detail && modalBody && modal) {
                modalBody.innerHTML = `
                    <div class="modal-subtitle" style="color: var(--accent-orange); font-weight: 600; margin-bottom: 0.5rem;">The Trident Edge</div>
                    <h2 style="margin-bottom: 1rem;">${title}</h2>
                    <p style="margin-bottom: 2rem;">${detail}</p>
                    <button class="btn btn-primary modal-cta" onclick="document.getElementById('service-modal').classList.remove('active'); document.body.style.overflow = '';">Got it <i class="fas fa-check"></i></button>
                `;
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
}

// Consultation form is handled by website-form.js.

/**
 * Custom Dropdown Logic
 */
function initCustomDropdown() {
    const header = document.getElementById('custom-dropdown-header');
    const content = document.getElementById('custom-dropdown-content');
    const confirmBtn = document.getElementById('dropdown-confirm-btn');
    const checkboxes = document.querySelectorAll('.custom-dropdown-content input[type="checkbox"]');
    
    if (!header || !content || !confirmBtn) return;
    
    header.addEventListener('click', () => {
        content.classList.toggle('open');
    });
    
    const updateHeader = () => {
        const checked = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.parentElement.innerText.trim());
        if (checked.length === 0) {
            header.innerHTML = 'Select Interested System(s) <i class="fas fa-chevron-down"></i>';
        } else if (checked.length === 1) {
            header.innerHTML = checked[0] + ' <i class="fas fa-chevron-down"></i>';
        } else {
            header.innerHTML = checked.length + ' Systems Selected <i class="fas fa-chevron-down"></i>';
        }
    };
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateHeader);
    });
    
    confirmBtn.addEventListener('click', () => {
        content.classList.remove('open');
    });
}


function initBlueprintHotspots() {
    const items = document.querySelectorAll('.clickable-hotspot');
    const modal = document.getElementById('service-modal');
    const modalBody = document.getElementById('modal-body');
    
    items.forEach(item => {
        item.addEventListener('click', () => {
            const detail = item.getAttribute('data-detail');
            const title = item.getAttribute('data-title');
            if(detail && modalBody && modal) {
                modalBody.innerHTML = `
                    <div class="modal-subtitle" style="color: var(--accent-orange); font-weight: 600; margin-bottom: 0.5rem;">Trident Engineering Standard</div>
                    <h2 style="margin-bottom: 1rem;">${title}</h2>
                    <p style="margin-bottom: 2rem;">${detail}</p>
                    <button class="btn btn-primary modal-cta" onclick="document.getElementById('service-modal').classList.remove('active'); document.body.style.overflow = '';">Got it <i class="fas fa-check"></i></button>
                `;
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
}

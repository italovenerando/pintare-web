// Menu mobile
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("nav");

menuToggle.addEventListener("click", () => {
    nav.classList.toggle("active");
});

// Inicialização do Swiper (Carrossel)
document.addEventListener("DOMContentLoaded", () => {
    const heroSwiper = new Swiper('.hero-swiper', {
        // Parâmetros
        slidesPerView: 1,
        loop: true,
        autoplay: {
            delay: 5000, // Aumentei um pouco o tempo de transição
            disableOnInteraction: false,
        },

        // Pagination (bolinhas)
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },

        // Navigation (setas) - Adicionado
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
});
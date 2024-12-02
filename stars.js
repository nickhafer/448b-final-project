function generateStars(count, layerClass) {
    const layer = document.querySelector(layerClass);
    const stars = [];
    
    for (let i = 0; i < count; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 1.5 + 0.5; // Random size between 0.5px and 2px
        stars.push(`radial-gradient(${size}px ${size}px at ${x}% ${y}%, white 100%, transparent 100%)`);
    }
    
    layer.style.backgroundImage = stars.join(',');
}

// Generate stars for each layer
window.addEventListener('load', () => {
    generateStars(100, '.stars-1');
    generateStars(200, '.stars-2');
    generateStars(300, '.stars-3');
});
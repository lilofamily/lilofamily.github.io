// Theme Toggle - Initialize after DOM is ready
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const html = document.documentElement;

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme, themeIcon);

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme, themeIcon);
    });
}

function updateThemeIcon(theme, themeIcon) {
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Application State
const state = {
    currentStep: 1,
    selectedPackages: [], // Array of {packageId, quantity, price, bonus}
    selectionMode: null, // 'surtido' or 'especifico'
    selectedDesigns: {}, // {designId: quantity}
    customerInfo: {
        firstName: '',
        lastName: '',
        phone: ''
    }
};

// Package Data
const packages = {
    1: { quantity: 1, price: 10, name: 'Paquete Individual', bonus: null },
    4: { quantity: 4, price: 35, name: 'Paquete Familiar', bonus: null },
    8: { quantity: 8, price: 70, name: 'Paquete Grande', bonus: '1 Chocobomba Jengibre' },
    12: { quantity: 12, price: 105, name: 'Paquete Extra Grande', bonus: '2 Chocobombas Jengibre' }
};

// Design Names and Emojis (20 designs)
const designs = [
    { name: 'Santa Claus', emoji: '🎅' },
    { name: 'Reno Navideño', emoji: '🦌' },
    { name: 'Árbol de Navidad', emoji: '🎄' },
    { name: 'Copo de Nieve', emoji: '❄️' },
    { name: 'Campana Dorada', emoji: '🔔' },
    { name: 'Muñeco de Nieve', emoji: '⛄' },
    { name: 'Estrella Navideña', emoji: '⭐' },
    { name: 'Regalo Rojo', emoji: '🎁' },
    { name: 'Bota Navideña', emoji: '🧦' },
    { name: 'Corona Navideña', emoji: '👑' },
    { name: 'Velas Navideñas', emoji: '🕯️' },
    { name: 'Galleta de Jengibre', emoji: '🍪' },
    { name: 'Bastón de Caramelo', emoji: '🍭' },
    { name: 'Trineo de Santa', emoji: '🛷' },
    { name: 'Luces Navideñas', emoji: '💡' },
    { name: 'Bola Navideña', emoji: '🔴' },
    { name: 'Casa de Jengibre', emoji: '🏠' },
    { name: 'Ángel Navideño', emoji: '👼' },
    { name: 'Corona de Adviento', emoji: '🕎' },
    { name: 'Chimenea Navideña', emoji: '🔥' }
];

// WhatsApp Number
const whatsappNumber = '59160139013';

// Step Navigation
function showStep(stepNumber) {
    console.log('=== showStep called with:', stepNumber, '===');
    
    // Hide all steps
    const allSteps = document.querySelectorAll('.step');
    console.log('Found', allSteps.length, 'steps');
    allSteps.forEach((step, index) => {
        step.classList.remove('active');
        console.log('Removed active from step', index + 1);
    });
    
    // Show current step
    const stepId = `step${stepNumber}`;
    console.log('Looking for element with id:', stepId);
    const currentStepElement = document.getElementById(stepId);
    console.log('Step element found:', currentStepElement);
    
    if (currentStepElement) {
        currentStepElement.classList.add('active');
        console.log('Added active class to step', stepNumber);
        state.currentStep = stepNumber;
        updateProgressBar();
        console.log('Step', stepNumber, 'is now active, state updated');
        
        // Force a reflow to ensure display change
        currentStepElement.offsetHeight;
        
        // Trigger initialization for specific steps
        if (stepNumber === 3 && typeof window.initializeDesignsStep3 === 'function') {
            setTimeout(() => window.initializeDesignsStep3(), 100);
        }
        if (stepNumber === 4 && typeof window.updateOrderSummaryStep4 === 'function') {
            setTimeout(() => window.updateOrderSummaryStep4(), 100);
        }
    } else {
        console.error('ERROR: Step element not found for step', stepNumber);
        alert('Error: No se pudo encontrar el paso ' + stepNumber);
    }
}

function updateProgressBar() {
    const totalSteps = 4;
    const progress = (state.currentStep / totalSteps) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
}

// Step 1: Package Selection
function initializeStep1() {
    const btnNext1 = document.getElementById('btnNext1');
    if (!btnNext1) {
        console.error('btnNext1 not found!');
        return;
    }

    // Function to update button state - always enabled now
    function updateButtonState() {
        // Button is always enabled, no need to update
    }

    // Function to handle package selection
    function handlePackageChange(checkbox) {
        const packageId = parseInt(checkbox.getAttribute('data-package'));
        if (!packageId || !packages[packageId]) return;

        const packageData = packages[packageId];
        const card = checkbox.closest('.package-card');

        if (checkbox.checked) {
            // Add if not already in array
            if (!state.selectedPackages.some(p => p.packageId === packageId)) {
                state.selectedPackages.push({
                    packageId: packageId,
                    quantity: packageData.quantity,
                    price: packageData.price,
                    name: packageData.name,
                    bonus: packageData.bonus
                });
            }
            if (card) card.classList.add('selected');
        } else {
            // Remove from array
            state.selectedPackages = state.selectedPackages.filter(p => p.packageId !== packageId);
            if (card) card.classList.remove('selected');
        }

        // Always update button after change
        updateButtonState();
    }

    // Attach events to all checkboxes
    document.querySelectorAll('.package-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            handlePackageChange(this);
        });
    });

    // Attach click events to cards
    document.querySelectorAll('.package-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Skip if clicking directly on checkbox (let change event handle it)
            if (e.target.type === 'checkbox') {
                return;
            }
            // Toggle checkbox when clicking card
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                // Trigger change event
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    });

    // Next button handler - MULTIPLE METHODS TO ENSURE IT WORKS
    console.log('Setting up button handlers for btnNext1');
    
    // Method 1: onclick
    btnNext1.onclick = function() {
        console.log('ONCLICK triggered!');
        if (state.selectedPackages.length > 0) {
            showStep(2);
        } else {
            alert('Por favor, selecciona al menos un paquete antes de continuar');
        }
        return false;
    };
    
    // Method 2: addEventListener
    btnNext1.addEventListener('click', function(e) {
        console.log('ADD EVENT LISTENER triggered!');
        e.preventDefault();
        e.stopPropagation();
        
        if (state.selectedPackages.length > 0) {
            console.log('Calling showStep(2)');
            showStep(2);
        } else {
            alert('Por favor, selecciona al menos un paquete antes de continuar');
        }
        return false;
    }, false);
    
    console.log('Button handlers set up complete');
}

// Step 2: Selection Mode
function initializeStep2() {
    const modeCards = document.querySelectorAll('.mode-card');
    const btnBack2 = document.getElementById('btnBack2');

    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.selectionMode = card.dataset.mode;

            // If surtido, skip to step 4
            if (state.selectionMode === 'surtido') {
                showStep(4);
            } else {
                // If especifico, go to step 3
                showStep(3);
            }
        });
    });

    btnBack2.addEventListener('click', () => {
        showStep(1);
    });
}

// Step 3: Design Selection
function initializeStep3() {
    const btnBack3 = document.getElementById('btnBack3');
    const btnNext3 = document.getElementById('btnNext3');
    const designsGrid = document.getElementById('designsGrid');
    const remainingCountEl = document.getElementById('remainingCount');

    function calculateTotalQuantity() {
        return state.selectedPackages.reduce((sum, pkg) => sum + pkg.quantity, 0);
    }

    function calculateSelectedQuantity() {
        return Object.values(state.selectedDesigns).reduce((sum, qty) => sum + qty, 0);
    }

    function updateRemainingCount() {
        const total = calculateTotalQuantity();
        const selected = calculateSelectedQuantity();
        const remaining = total - selected;
        remainingCountEl.textContent = remaining;
        
        // Button is always enabled now, just update design cards
        updateDesignCards();
    }

    function updateDesignCards() {
        const total = calculateTotalQuantity();
        const selected = calculateSelectedQuantity();
        const remaining = total - selected;

        document.querySelectorAll('.design-card').forEach(card => {
            const designId = parseInt(card.dataset.designId);
            const currentQty = state.selectedDesigns[designId] || 0;
            const counterValue = card.querySelector('.counter-value');
            const decreaseBtn = card.querySelector('[data-action="decrease"]');
            const increaseBtn = card.querySelector('[data-action="increase"]');
            
            if (counterValue) {
                counterValue.textContent = currentQty;
            }

            // Update button states
            if (decreaseBtn) {
                decreaseBtn.disabled = currentQty === 0;
            }
            if (increaseBtn) {
                increaseBtn.disabled = remaining === 0;
            }

            // Disable card if we've reached the limit and this design has 0
            if (remaining === 0 && currentQty === 0) {
                card.classList.add('disabled');
            } else {
                card.classList.remove('disabled');
            }
        });
    }

    function initializeDesigns() {
        designsGrid.innerHTML = '';
        designs.forEach((design, index) => {
            const designCard = document.createElement('div');
            designCard.className = 'design-card';
            designCard.dataset.designId = index;
            const currentQty = state.selectedDesigns[index] || 0;
            designCard.innerHTML = `
                <div class="design-image">${design.emoji}</div>
                <div class="design-name">${design.name}</div>
                <div class="design-counter">
                    <button class="counter-btn" data-action="decrease" ${currentQty <= 0 ? 'disabled' : ''}>-</button>
                    <span class="counter-value">${currentQty}</span>
                    <button class="counter-btn" data-action="increase">+</button>
                </div>
            `;
            
            // Add event listeners
            const decreaseBtn = designCard.querySelector('[data-action="decrease"]');
            const increaseBtn = designCard.querySelector('[data-action="increase"]');
            
            decreaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentQty = state.selectedDesigns[index] || 0;
                if (currentQty > 0) {
                    state.selectedDesigns[index] = currentQty - 1;
                    if (state.selectedDesigns[index] === 0) {
                        delete state.selectedDesigns[index];
                    }
                    updateRemainingCount();
                }
            });
            
            increaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const remaining = calculateTotalQuantity() - calculateSelectedQuantity();
                if (remaining > 0) {
                    state.selectedDesigns[index] = (state.selectedDesigns[index] || 0) + 1;
                    updateRemainingCount();
                }
            });
            
            designsGrid.appendChild(designCard);
        });
        
        updateRemainingCount();
    }

    // Make initializeDesigns available globally for showStep
    window.initializeDesignsStep3 = initializeDesigns;

    btnBack3.addEventListener('click', () => {
        showStep(2);
    });

    btnNext3.addEventListener('click', () => {
        const total = calculateTotalQuantity();
        const selected = calculateSelectedQuantity();
        if (total === selected) {
            showStep(4);
        } else {
            const remaining = total - selected;
            alert(`Por favor, selecciona ${remaining} diseño${remaining > 1 ? 's' : ''} más antes de continuar`);
        }
    });
}

// Step 4: Final Form
function initializeStep4() {
    const btnBack4 = document.getElementById('btnBack4');
    const btnSubmit = document.getElementById('btnSubmit');
    const orderForm = document.getElementById('orderForm');
    const orderSummary = document.getElementById('orderSummary');

    function updateOrderSummary() {
        let summaryHTML = '';
        let totalPrice = 0;

        state.selectedPackages.forEach(pkg => {
            totalPrice += pkg.price;
            summaryHTML += `
                <div class="summary-item">
                    <div>
                        <h4>${pkg.name}</h4>
                        <p>${pkg.quantity} chocobombas${pkg.bonus ? ` + ${pkg.bonus}` : ''}</p>
                    </div>
                    <div>
                        <p style="font-weight: 600; color: var(--accent-green);">${pkg.price} Bs.</p>
                    </div>
                </div>
            `;
        });

        if (state.selectionMode === 'especifico' && Object.keys(state.selectedDesigns).length > 0) {
            summaryHTML += `<div class="summary-item"><h4>Diseños Seleccionados:</h4></div>`;
            Object.entries(state.selectedDesigns).forEach(([designId, quantity]) => {
                if (quantity > 0) {
                    const design = designs[parseInt(designId)];
                    summaryHTML += `
                        <div class="summary-item">
                            <div>
                                <p>${design.emoji} ${design.name}</p>
                            </div>
                            <div>
                                <p style="font-weight: 600;">x${quantity}</p>
                            </div>
                        </div>
                    `;
                }
            });
        } else {
            summaryHTML += `
                <div class="summary-item">
                    <p><strong>Tipo:</strong> Surtido (diseños variados)</p>
                </div>
            `;
        }

        summaryHTML += `
            <div class="summary-total">
                <h3>Total</h3>
                <h3 style="color: var(--accent-green);">${totalPrice} Bs.</h3>
            </div>
        `;

        orderSummary.innerHTML = summaryHTML;
    }

    // Make updateOrderSummary available globally for showStep
    window.updateOrderSummaryStep4 = updateOrderSummary;

    btnBack4.addEventListener('click', () => {
        if (state.selectionMode === 'especifico') {
            showStep(3);
        } else {
            showStep(2);
        }
    });

    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        state.customerInfo.firstName = document.getElementById('firstName').value.trim();
        state.customerInfo.lastName = document.getElementById('lastName').value.trim();
        state.customerInfo.phone = document.getElementById('phone').value.trim();

        if (state.customerInfo.firstName && state.customerInfo.lastName && state.customerInfo.phone) {
            sendToWhatsApp();
        }
    });

}

// Generate WhatsApp Message
function generateWhatsAppMessage() {
    let message = `¡Hola! Me interesa hacer un pedido de Chocobombas K-boom 🎄\n\n`;
    
    // Customer Info
    message += `*Datos del Cliente:*\n`;
    message += `Nombre: ${state.customerInfo.firstName} ${state.customerInfo.lastName}\n`;
    message += `Teléfono: ${state.customerInfo.phone}\n\n`;
    
    // Packages
    message += `*Pedido:*\n`;
    let totalPrice = 0;
    let totalQuantity = 0;
    
    state.selectedPackages.forEach((pkg, index) => {
        totalPrice += pkg.price;
        totalQuantity += pkg.quantity;
        message += `${index + 1}. ${pkg.name}: ${pkg.quantity} chocobombas`;
        if (pkg.bonus) {
            message += ` + ${pkg.bonus} 🎁`;
        }
        message += ` - ${pkg.price} Bs.\n`;
    });
    
    message += `\n*Total de chocobombas:* ${totalQuantity}\n`;
    
    // Designs
    if (state.selectionMode === 'especifico' && Object.keys(state.selectedDesigns).length > 0) {
        message += `\n*Diseños específicos elegidos:*\n`;
        Object.entries(state.selectedDesigns).forEach(([designId, quantity]) => {
            if (quantity > 0) {
                const design = designs[parseInt(designId)];
                message += `• ${design.emoji} ${design.name}: x${quantity}\n`;
            }
        });
    } else {
        message += `\n*Tipo:* Surtido (diseños variados)\n`;
    }
    
    message += `\n*Total a pagar:* ${totalPrice} Bs.\n`;
    message += `\n¿Podrían confirmarme la disponibilidad y el tiempo de entrega? ¡Gracias! 🎅`;

    return encodeURIComponent(message);
}

function sendToWhatsApp() {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// Initialize on page load
function initApp() {
    console.log('=== INITIALIZING APP ===');
    console.log('DOM ready state:', document.readyState);
    initializeTheme();
    initializeStep1();
    initializeStep2();
    initializeStep3();
    initializeStep4();
    updateProgressBar();
    console.log('=== ALL STEPS INITIALIZED ===');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}

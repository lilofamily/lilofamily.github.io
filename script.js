// Theme Toggle - Initialize after DOM is ready
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const html = document.documentElement;

    // Detect system preference
    function getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    // Load saved theme from localStorage, or use system preference
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || getSystemTheme();
    
    html.setAttribute('data-theme', initialTheme);
    updateThemeIcon(initialTheme, themeIcon);

    // Listen for system theme changes
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only update if user hasn't manually set a preference
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                html.setAttribute('data-theme', newTheme);
                updateThemeIcon(newTheme, themeIcon);
            }
        });
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme); // Save user preference
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
    currentStep: 0, // Start at welcome screen
    selectedPackages: [], // Array of {packageId, quantity, price, bonus}
    selectionMode: null, // 'surtido' or 'especifico'
    selectedDesigns: {}, // {designId: quantity}
    jengibrePackages: {}, // {packageId: count} - cantidad de veces que se selecciona cada paquete de jengibre
    customerInfo: {
        fullName: '',
        phone: '',
        observations: '',
        depositAmount: 0
    }
};

// Package Data
const packages = {
    1: { quantity: 1, price: 10, name: 'Paquete Individual', bonus: null, type: 'regular' },
    4: { quantity: 4, price: 35, name: 'Paquete Familiar', bonus: null, type: 'regular' },
    8: { quantity: 8, price: 70, name: 'Paquete Grande', bonus: '1 Chocobomba Jengibre', type: 'regular' },
    12: { quantity: 12, price: 105, name: 'Paquete Extra Grande', bonus: '2 Chocobombas Jengibre', type: 'regular' },
    j1: { quantity: 1, price: 15, name: 'Paquete Individual de Jengibre', bonus: null, type: 'jengibre' },
    j2: { quantity: 2, price: 25, name: 'Paquete Pareja de Jengibre', bonus: null, type: 'jengibre' },
    j4: { quantity: 4, price: 50, name: 'Paquete Familiar de Jengibre', bonus: null, type: 'jengibre' },
    j6: { quantity: 6, price: 75, name: 'Paquete Extra Grande de Jengibre', bonus: null, type: 'jengibre' }
};

// Helper functions to identify package types
function isJengibrePackage(packageId) {
    return typeof packageId === 'string' && packageId.startsWith('j');
}

function hasRegularPackages() {
    return state.selectedPackages.some(pkg => !isJengibrePackage(pkg.packageId));
}

function hasJengibrePackages() {
    return state.selectedPackages.some(pkg => isJengibrePackage(pkg.packageId));
}

function hasOnlyJengibrePackages() {
    return state.selectedPackages.length > 0 && 
           state.selectedPackages.every(pkg => isJengibrePackage(pkg.packageId));
}

function getRegularPackagesQuantity() {
    return state.selectedPackages
        .filter(pkg => !isJengibrePackage(pkg.packageId))
        .reduce((sum, pkg) => sum + pkg.quantity, 0);
}

function getJengibrePackagesQuantity() {
    return state.selectedPackages
        .filter(pkg => isJengibrePackage(pkg.packageId))
        .reduce((sum, pkg) => sum + pkg.quantity, 0);
}

// Design Names and Images (30 designs)
const designs = [
    { name: 'code: 001', image: 'images/chocos/choco_01.png' },
    { name: 'code: 002', image: 'images/chocos/choco_02.png' },
    { name: 'code: 003', image: 'images/chocos/choco_03.png' },
    { name: 'code: 004', image: 'images/chocos/choco_04.png' },
    { name: 'code: 005', image: 'images/chocos/choco_05.png' },
    { name: 'code: 006', image: 'images/chocos/choco_06.png' },
    { name: 'code: 007', image: 'images/chocos/choco_07.png' },
    { name: 'code: 008', image: 'images/chocos/choco_08.png' },
    { name: 'code: 009', image: 'images/chocos/choco_09.png' },
    { name: 'code: 010', image: 'images/chocos/choco_10.png' },
    { name: 'code: 011', image: 'images/chocos/choco_11.png' },
    { name: 'code: 012', image: 'images/chocos/choco_12.png' },
    { name: 'code: 013', image: 'images/chocos/choco_13.png' },
    { name: 'code: 014', image: 'images/chocos/choco_14.png' },
    { name: 'code: 015', image: 'images/chocos/choco_15.png' },
    { name: 'code: 016', image: 'images/chocos/choco_16.png' },
    { name: 'code: 017', image: 'images/chocos/choco_17.png' },
    { name: 'code: 018', image: 'images/chocos/choco_18.png' },
    { name: 'code: 019', image: 'images/chocos/choco_19.png' },
    { name: 'code: 020', image: 'images/chocos/choco_20.png' },
    { name: 'code: 021', image: 'images/chocos/choco_21.png' },
    { name: 'code: 022', image: 'images/chocos/choco_22.png' },
    { name: 'code: 023', image: 'images/chocos/choco_23.png' },
    { name: 'code: 024', image: 'images/chocos/choco_24.png' },
    { name: 'code: 025', image: 'images/chocos/choco_25.png' },
    { name: 'code: 026', image: 'images/chocos/choco_26.png' },
    { name: 'code: 027', image: 'images/chocos/choco_27.png' },
    { name: 'code: 028', image: 'images/chocos/choco_28.png' },
    { name: 'code: 029', image: 'images/chocos/choco_29.png' },
    { name: 'code: 030', image: 'images/chocos/choco_30.png' }
];

// WhatsApp Number
const whatsappNumber = '59160139013';

// Step Navigation
function showStep(stepNumber) {
    console.log('=== showStep called with:', stepNumber, '===');
    
    // Validation: If trying to show step 2 or 3 but only jengibre packages selected, skip to step 4
    if ((stepNumber === 2 || stepNumber === 3) && hasOnlyJengibrePackages()) {
        console.log('Only jengibre packages selected, skipping to step 4');
        stepNumber = 4;
    }
    
    // Validation: If trying to show step 2 but no regular packages, skip to step 4
    if (stepNumber === 2 && !hasRegularPackages()) {
        console.log('No regular packages selected, skipping to step 4');
        stepNumber = 4;
    }
    
    // Hide all steps
    const allSteps = document.querySelectorAll('.step');
    console.log('Found', allSteps.length, 'steps');
    allSteps.forEach((step, index) => {
        step.classList.remove('active');
        console.log('Removed active from step', index);
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
        
        // Show/hide progress bar based on step
        const progressContainer = document.getElementById('progressContainer');
        
        if (stepNumber === 0) {
            // Welcome screen - hide progress
            if (progressContainer) progressContainer.classList.remove('show');
        } else {
            // Other steps - show progress
            if (progressContainer) progressContainer.classList.add('show');
        }
        
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
        showDialog('Error', 'No se pudo encontrar el paso ' + stepNumber);
    }
}

function updateProgressBar() {
    const totalSteps = 4; // Steps 1-4 (step 0 is welcome screen)
    if (state.currentStep === 0) {
        document.getElementById('progressBar').style.width = '0%';
    } else {
        const progress = (state.currentStep / totalSteps) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
    }
}

// Custom Dialog Functions
function showDialog(title, message) {
    const overlay = document.getElementById('dialogOverlay');
    const dialogTitle = document.getElementById('dialogTitle');
    const dialogMessage = document.getElementById('dialogMessage');
    
    if (overlay && dialogTitle && dialogMessage) {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        overlay.classList.add('active');
        
        // Prevent body scroll when dialog is open
        document.body.style.overflow = 'hidden';
    }
}

function hideDialog() {
    const overlay = document.getElementById('dialogOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Initialize dialog
function initializeDialog() {
    const overlay = document.getElementById('dialogOverlay');
    const dialogBtn = document.getElementById('dialogBtn');
    
    if (overlay && dialogBtn) {
        // Close on button click
        dialogBtn.addEventListener('click', hideDialog);
        
        // Close on overlay click (outside dialog)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideDialog();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                hideDialog();
            }
        });
    }
}

// Step 1: Package Selection
function initializeStep1() {
    const btnNext1 = document.getElementById('btnNext1');
    if (!btnNext1) {
        console.error('btnNext1 not found!');
        return;
    }
    
    // Initialize j6 counter display
    updateJengibreCounterDisplay('j6');

    // Function to update button state - always enabled now
    function updateButtonState() {
        // Button is always enabled, no need to update
    }

    // Function to handle package selection (checkboxes for regular and j1, j2, j4)
    function handlePackageChange(checkbox) {
        const packageIdAttr = checkbox.getAttribute('data-package');
        // Handle both numeric IDs (regular packages) and string IDs (j1, j2, j4)
        const packageId = packageIdAttr.startsWith('j') ? packageIdAttr : parseInt(packageIdAttr);
        if (!packageId || !packages[packageId]) return;
        
        // Skip j6 as it uses counter
        if (packageId === 'j6') return;

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

        updateJengibrePackagesInState();
        updateButtonState();
    }

    // Function to handle jengibre package counter (only for j6, works in multiples of 6)
    function handleJengibreCounter(packageId, action) {
        if (packageId !== 'j6') return;
        
        const currentQuantity = state.jengibrePackages[packageId] || 0;
        const unitQuantity = 6; // Increment/decrement by 6 units
        const unitPrice = 75;
        
        let newQuantity = currentQuantity;
        
        if (action === 'increase') {
            // Always add 6 units
            newQuantity = currentQuantity + unitQuantity;
        } else if (action === 'decrease' && currentQuantity > 0) {
            // Subtract 6 units, but don't go below 0
            newQuantity = Math.max(0, currentQuantity - unitQuantity);
        }
        
        if (newQuantity === 0) {
            delete state.jengibrePackages[packageId];
        } else {
            state.jengibrePackages[packageId] = newQuantity;
        }
        
        updateJengibreCounterDisplay(packageId);
        updateJengibrePackagesInState();
        updateButtonState();
    }

    // Update jengibre counter display (only for j6)
    function updateJengibreCounterDisplay(packageId) {
        if (packageId !== 'j6') return;
        
        const counterValue = document.querySelector(`.counter-value[data-package="${packageId}"]`);
        const decreaseBtn = document.querySelector(`.counter-btn[data-action="decrease"][data-package="${packageId}"]`);
        const quantityEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-quantity-dynamic`);
        const priceEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-price-dynamic`);
        const card = document.querySelector(`.package-card[data-package="${packageId}"]`);
        
        const quantity = state.jengibrePackages[packageId] || 0;
        const unitPrice = 75;
        const totalPrice = (quantity / 6) * unitPrice;
        
        // Function to format quantity text (media docena, 1 docena, 1 docena y media, etc.)
        function formatQuantityText(qty) {
            if (qty === 0) return '0';
            if (qty === 6) return 'media docena';
            
            const docenas = Math.floor(qty / 12);
            const media = (qty % 12) === 6;
            
            if (docenas === 0 && media) {
                return 'media docena';
            } else if (docenas === 1 && !media) {
                return '1 docena';
            } else if (docenas === 1 && media) {
                return '1 docena y media';
            } else if (docenas > 1 && !media) {
                return `${docenas} docenas`;
            } else if (docenas > 1 && media) {
                return `${docenas} docenas y media`;
            }
            return `${qty} unidades`;
        }
        
        // Update counter value (shows formatted text)
        if (counterValue) {
            counterValue.textContent = formatQuantityText(quantity);
        }
        
        // Update decrease button
        if (decreaseBtn) {
            decreaseBtn.disabled = quantity === 0;
        }
        
        // Update quantity text
        if (quantityEl) {
            quantityEl.textContent = `${quantity} Chocobombas de Jengibre`;
        }
        
        // Update price text
        if (priceEl) {
            priceEl.textContent = `${totalPrice} Bs.`;
        }
        
        // Update card selected state
        if (card) {
            if (quantity > 0) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    }

    // Update state.selectedPackages with jengibre packages
    function updateJengibrePackagesInState() {
        // Remove only j6 packages from selectedPackages (j1, j2, j4 are handled by checkboxes)
        state.selectedPackages = state.selectedPackages.filter(p => p.packageId !== 'j6');
        
        // Add j6 packages based on quantity (works in multiples of 6)
        if (state.jengibrePackages['j6'] && state.jengibrePackages['j6'] > 0) {
            const quantity = state.jengibrePackages['j6'];
            const unitPrice = 75;
            const numberOfPackages = quantity / 6;
            const totalPrice = numberOfPackages * unitPrice;
            
            // Add one entry with total quantity and price
            state.selectedPackages.push({
                packageId: 'j6',
                quantity: quantity,
                price: totalPrice,
                name: 'Paquete Extra Grande de Jengibre',
                bonus: null
            });
        }
    }

    // Attach events to all checkboxes (regular packages and j1, j2, j4)
    document.querySelectorAll('.package-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            handlePackageChange(this);
        });
    });

    // Attach click events to package cards (except j6 which has counter)
    document.querySelectorAll('.package-card:not(.jengibre-package)').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox' || e.target.closest('.counter-btn')) {
                return;
            }
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    });

    // Attach events to j6 counter buttons only
    document.querySelectorAll('.jengibre-package .counter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            const packageId = this.getAttribute('data-package');
            if (packageId === 'j6') {
                handleJengibreCounter(packageId, action);
            }
        });
    });
    
    // Prevent card click from affecting j6 counter
    document.querySelectorAll('.jengibre-package').forEach(card => {
        card.addEventListener('click', function(e) {
            // Only prevent if clicking outside counter buttons
            if (!e.target.closest('.counter-btn') && !e.target.closest('.package-checkbox')) {
                e.stopPropagation();
            }
        });
    });

    // Next button handler - MULTIPLE METHODS TO ENSURE IT WORKS
    console.log('Setting up button handlers for btnNext1');
    
    function handleNextFromStep1() {
        if (state.selectedPackages.length === 0) {
            showDialog('Atención', 'Por favor, selecciona al menos un paquete antes de continuar');
            return;
        }
        
        // If only jengibre packages selected, skip to final step
        if (hasOnlyJengibrePackages()) {
            state.selectionMode = null; // No design selection needed
            showStep(4);
        } else {
            // Has regular packages, go to design selection mode
            showStep(2);
        }
    }
    
    // Method 1: onclick
    btnNext1.onclick = function() {
        console.log('ONCLICK triggered!');
        handleNextFromStep1();
        return false;
    };
    
    // Method 2: addEventListener
    btnNext1.addEventListener('click', function(e) {
        console.log('ADD EVENT LISTENER triggered!');
        e.preventDefault();
        e.stopPropagation();
        handleNextFromStep1();
        return false;
    }, false);
    
    console.log('Button handlers set up complete');
}

// Step 2: Selection Mode
function initializeStep2() {
    const modeCards = document.querySelectorAll('.mode-card');
    const btnBack2 = document.getElementById('btnBack2');

    // Only show step 2 if there are regular packages
    // This check happens when step 2 is shown
    function checkIfStep2ShouldBeShown() {
        if (!hasRegularPackages()) {
            // If no regular packages, skip to step 4
            showStep(4);
            return false;
        }
        return true;
    }

    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            // Only allow selection if there are regular packages
            if (!hasRegularPackages()) {
                showStep(4);
                return;
            }

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

    // Store check function globally for showStep to use
    window.checkStep2 = checkIfStep2ShouldBeShown;
}

// Step 3: Design Selection
function initializeStep3() {
    const btnBack3 = document.getElementById('btnBack3');
    const btnNext3 = document.getElementById('btnNext3');
    const designsGrid = document.getElementById('designsGrid');
    const remainingCountEl = document.getElementById('remainingCount');

    function calculateTotalQuantity() {
        // Only count regular packages for design selection
        return getRegularPackagesQuantity();
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
                <div class="design-image">
                    <img src="${design.image}" alt="${design.name}" loading="lazy">
                </div>
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
            showDialog('Atención', `Por favor, selecciona ${remaining} diseño${remaining > 1 ? 's' : ''} más antes de continuar`);
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
        let regularPackages = [];
        let jengibrePackages = [];

        // Separate packages by type
        state.selectedPackages.forEach(pkg => {
            if (isJengibrePackage(pkg.packageId)) {
                jengibrePackages.push(pkg);
            } else {
                regularPackages.push(pkg);
            }
            totalPrice += pkg.price;
        });

        // Show regular packages first
        if (regularPackages.length > 0) {
            summaryHTML += '<div style="margin-bottom: 1.5rem;"><h4 style="color: var(--accent-green); font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">Chocobombas</h4>';
            regularPackages.forEach(pkg => {
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

            // Show design selection only for regular packages
            if (state.selectionMode === 'especifico' && Object.keys(state.selectedDesigns).length > 0) {
                summaryHTML += `<div class="summary-item"><h4>Diseños Seleccionados:</h4></div>`;
                Object.entries(state.selectedDesigns).forEach(([designId, quantity]) => {
                    if (quantity > 0) {
                        const design = designs[parseInt(designId)];
                        summaryHTML += `
                            <div class="summary-item">
                                <div>
                                    <p>${design.name}</p>
                                </div>
                                <div>
                                    <p style="font-weight: 600;">x${quantity}</p>
                                </div>
                            </div>
                        `;
                    }
                });
            } else if (state.selectionMode !== null) {
                summaryHTML += `
                    <div class="summary-item">
                        <p><strong>Tipo:</strong> Surtido (diseños variados)</p>
                    </div>
                `;
            }
            summaryHTML += '</div>';
        }

        // Show jengibre packages (grouped by type)
        if (jengibrePackages.length > 0) {
            summaryHTML += '<div style="margin-bottom: 1.5rem;"><h4 style="color: var(--accent-green); font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">Chocobombas de Jengibre</h4>';
            
            // Group jengibre packages by packageId
            const jengibreGroups = {};
            jengibrePackages.forEach(pkg => {
                if (!jengibreGroups[pkg.packageId]) {
                    jengibreGroups[pkg.packageId] = {
                        name: pkg.name,
                        quantity: 0,
                        price: 0,
                        unitPrice: pkg.price,
                        unitQuantity: pkg.quantity
                    };
                }
                jengibreGroups[pkg.packageId].quantity += pkg.quantity;
                jengibreGroups[pkg.packageId].price += pkg.price;
            });
            
            // Display grouped packages
            Object.values(jengibreGroups).forEach(group => {
                const count = group.quantity / group.unitQuantity;
                const countText = count > 1 ? ` x${count}` : '';
                summaryHTML += `
                    <div class="summary-item">
                        <div>
                            <h4>${group.name}${countText}</h4>
                            <p>${group.quantity} chocobombas de jengibre</p>
                        </div>
                        <div>
                            <p style="font-weight: 600; color: var(--accent-green);">${group.price} Bs.</p>
                        </div>
                    </div>
                `;
            });
            summaryHTML += '</div>';
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
        // If only jengibre packages, go back to step 1
        if (hasOnlyJengibrePackages()) {
            showStep(1);
        } else if (state.selectionMode === 'especifico') {
            showStep(3);
        } else {
            showStep(2);
        }
    });

    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        state.customerInfo.fullName = document.getElementById('fullName').value.trim();
        state.customerInfo.phone = document.getElementById('phone').value.trim();
        state.customerInfo.observations = document.getElementById('observations').value.trim();
        state.customerInfo.depositAmount = parseFloat(document.getElementById('depositAmount').value) || 0;

        if (state.customerInfo.fullName && state.customerInfo.phone && state.customerInfo.depositAmount > 0) {
            sendToWhatsApp();
        } else {
            showDialog('Atención', 'Por favor, completa todos los campos obligatorios, incluyendo el monto depositado');
        }
    });

}

// Generate WhatsApp Message
function generateWhatsAppMessage() {
    let message = `¡Hola! Me interesa hacer un pedido de Chocobombas K-boom\n\n`;
    
    // Customer Info
    message += `*DATOS DEL CLIENTE*\n`;
    message += `Nombre: *${state.customerInfo.fullName}*\n`;
    message += `Teléfono: *${state.customerInfo.phone}*\n\n`;
    
    // Separate packages by type
    let regularPackages = [];
    let jengibrePackages = [];
    let totalPrice = 0;
    
    state.selectedPackages.forEach(pkg => {
        if (isJengibrePackage(pkg.packageId)) {
            jengibrePackages.push(pkg);
        } else {
            regularPackages.push(pkg);
        }
        totalPrice += pkg.price;
    });
    
    message += `*DETALLE DEL PEDIDO*\n\n`;
    
    // Regular packages
    if (regularPackages.length > 0) {
        message += `*CHOCOBOMBAS:*\n`;
        regularPackages.forEach((pkg, index) => {
            message += `${index + 1}. *${pkg.name}*\n`;
            message += `   - Cantidad: *${pkg.quantity} chocobombas*\n`;
            if (pkg.bonus) {
                message += `   - Regalo: *${pkg.bonus}*\n`;
            }
            message += `   - Precio: *${pkg.price} Bs.*\n\n`;
        });
        
        // Designs for regular packages
        if (state.selectionMode === 'especifico' && Object.keys(state.selectedDesigns).length > 0) {
            message += `*DISEÑOS SELECCIONADOS:*\n`;
            Object.entries(state.selectedDesigns).forEach(([designId, quantity]) => {
                if (quantity > 0) {
                    const design = designs[parseInt(designId)];
                    message += `• ${design.name}: *x${quantity}*\n`;
                }
            });
            message += `\n`;
        } else if (state.selectionMode !== null) {
            message += `*Tipo:* Surtido (diseños variados)\n\n`;
        }
    }
    
    // Jengibre packages (grouped by type)
    if (jengibrePackages.length > 0) {
        message += `*CHOCOBOMBAS DE JENGIBRE:*\n`;
        
        // Group jengibre packages by packageId
        const jengibreGroups = {};
        jengibrePackages.forEach(pkg => {
            if (!jengibreGroups[pkg.packageId]) {
                jengibreGroups[pkg.packageId] = {
                    name: pkg.name,
                    quantity: 0,
                    price: 0,
                    unitPrice: pkg.price,
                    unitQuantity: pkg.quantity
                };
            }
            jengibreGroups[pkg.packageId].quantity += pkg.quantity;
            jengibreGroups[pkg.packageId].price += pkg.price;
        });
        
        // Display grouped packages
        let index = 1;
        Object.values(jengibreGroups).forEach(group => {
            const count = group.quantity / group.unitQuantity;
            const countText = count > 1 ? ` (x${count})` : '';
            message += `${index}. *${group.name}${countText}*\n`;
            message += `   - Cantidad: *${group.quantity} chocobombas de jengibre*\n`;
            message += `   - Precio: *${group.price} Bs.*\n\n`;
            index++;
        });
    }
    
    // Totals
    const totalRegular = getRegularPackagesQuantity();
    const totalJengibre = getJengibrePackagesQuantity();
    
    if (totalRegular > 0 && totalJengibre > 0) {
        message += `*RESUMEN:*\n`;
        message += `• Chocobombas: *${totalRegular}*\n`;
        message += `• Chocobombas de Jengibre: *${totalJengibre}*\n`;
        message += `• Total unidades: *${totalRegular + totalJengibre}*\n\n`;
    } else if (totalRegular > 0) {
        message += `*Total de chocobombas: ${totalRegular}*\n\n`;
    } else if (totalJengibre > 0) {
        message += `*Total de chocobombas de jengibre: ${totalJengibre}*\n\n`;
    }
    
    message += `*TOTAL A PAGAR: ${totalPrice} Bs.*\n\n`;
    
    // Deposit information
    const depositAmount = state.customerInfo.depositAmount || 0;
    const remainingAmount = totalPrice - depositAmount;
    const depositPercentage = totalPrice > 0 ? Math.round((depositAmount / totalPrice) * 100) : 0;
    
    message += `*INFORMACIÓN DE PAGO*\n`;
    message += `• Monto depositado: *${depositAmount} Bs.* (${depositPercentage}%)\n`;
    message += `• Monto restante: *${remainingAmount} Bs.*\n`;
    message += `• Total del pedido: *${totalPrice} Bs.*\n\n`;
    
    message += `*CONSULTAS*\n`;
    message += `• ¿Qué día y en qué horarios podría recoger de la Plaza del Estudiante?\n`;
    message += `• ¿Les llegó la transferencia de ${depositAmount} Bs.?\n\n`;
    
    // Observations
    if (state.customerInfo.observations) {
        message += `*OBSERVACIONES*\n`;
        message += `${state.customerInfo.observations}\n\n`;
    }
    
    message += `¿Podrían confirmarme la disponibilidad y el tiempo de entrega? ¡Gracias!`;

    return encodeURIComponent(message);
}

function sendToWhatsApp() {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// Initialize Welcome Screen
function initializeWelcome() {
    const btnStart = document.getElementById('btnStart');
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            showStep(1);
        });
    }
}

// Initialize on page load
function initApp() {
    console.log('=== INITIALIZING APP ===');
    console.log('DOM ready state:', document.readyState);
    initializeTheme();
    initializeDialog();
    initializeWelcome();
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

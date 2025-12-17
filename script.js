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

// Google Sheets Configuration
// IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script Web App
// Obtén la URL después de desplegar tu script (ver instrucciones en google-apps-script.js)
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxT7lPaOzacrIBPOQUcjDHwDOhFk0iJOmaTsZtetpY4krP-4E5db-Xs7juL8oU-JNk/exec';

// Detectar si estamos en modo personal (/pedido o pedido.html)
const isPersonalMode = window.location.pathname.includes('/pedido') || 
                       window.location.pathname.includes('pedido.html') ||
                       window.location.href.includes('pedido.html');

// Application State
const state = {
    currentStep: 0, // Start at welcome screen
    selectedPackages: [], // Array of {packageId, quantity, price, bonus}
    selectionMode: null, // 'surtido' or 'especifico'
    selectedDesigns: {}, // {designId: quantity} - DEPRECATED: usar selectedDesignsByPackage
    selectedDesignsByPackage: {}, // {packageId: {designId: quantity}} - diseños seleccionados por tipo de paquete
    selectionModeByPackage: {}, // {packageId: 'surtido' | 'especifico'} - modo de selección por tipo de paquete
    surtidoRemainingByPackage: {}, // {packageId: quantity} - cantidad de chocobombas marcadas como surtidas (restantes)
    currentPackageDesignSelection: null, // packageId del paquete actual para el que se están seleccionando diseños
    packageDesignSelectionQueue: [], // Array de packageIds que necesitan selección de diseños
    jengibrePackages: {}, // {packageId: count} - DEPRECATED: j6 now uses jengibrePackagesCount
    jengibrePackagesCount: {}, // {packageId: count} - cantidad de paquetes de jengibre seleccionados (j1, j2, j4, j6)
    regularPackagesCount: {}, // {packageId: count} - cantidad de paquetes regulares seleccionados (1, 4, 8, 12)
        customerInfo: {
            fullName: '',
            phone: '',
            observations: '',
            depositAmount: 0,
            deliveryDate: '',
            deliveryTime: ''
        }
};

// Package Data
const packages = {
    1: { quantity: 1, price: 10, name: 'Paquete Individual', bonus: null, type: 'regular' },
    4: { quantity: 4, price: 35, name: 'Paquete Familiar', bonus: null, type: 'regular' },
    8: { quantity: 8, price: 70, name: 'Paquete Grande', bonus: '+ 1 Chocobomba Jengibre de Regalo 🎁', type: 'regular' },
    12: { quantity: 12, price: 105, name: 'Paquete Extra Grande', bonus: '+ 2 Chocobombas Jengibre de Regalo 🎁', type: 'regular' },
    j1: { quantity: 1, price: 15, name: 'Paquete Individual de Jengibre', bonus: null, type: 'jengibre' },
    j2: { quantity: 2, price: 25, name: 'Paquete Pareja de Jengibre', bonus: null, type: 'jengibre' },
    j4: { quantity: 4, price: 50, name: 'Paquete Familiar de Jengibre', bonus: null, type: 'jengibre' },
    j6: { quantity: 6, price: 75, name: 'Paquete Extra Grande de Jengibre', bonus: null, type: 'jengibre' },
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

// Get unique regular package types that need design selection
// Includes custom packages as they also need design selection
function getUniqueRegularPackageTypes() {
    const regularPackages = state.selectedPackages.filter(pkg => 
        !isJengibrePackage(pkg.packageId)
    );
    const uniqueTypes = [...new Set(regularPackages.map(pkg => pkg.packageId))];
    return uniqueTypes;
}

// Get package count for a specific package type
function getPackageCountForType(packageId) {
    const package = state.selectedPackages.find(p => p.packageId === packageId);
    return package ? package.packageCount || 1 : 0;
}

// Get total quantity for a specific package type
function getQuantityForPackageType(packageId) {
    const package = state.selectedPackages.find(p => p.packageId === packageId);
    return package ? package.quantity : 0;
}

// Initialize package design selection queue
function initializePackageDesignQueue() {
    const uniqueTypes = getUniqueRegularPackageTypes();
    state.packageDesignSelectionQueue = uniqueTypes;
    state.currentPackageDesignSelection = null;
    // Initialize selectedDesignsByPackage and selectionModeByPackage for each package type
    uniqueTypes.forEach(packageId => {
        if (!state.selectedDesignsByPackage[packageId]) {
            state.selectedDesignsByPackage[packageId] = {};
        }
        if (!state.selectionModeByPackage[packageId]) {
            state.selectionModeByPackage[packageId] = null;
        }
    });
    console.log('Package design queue initialized:', {
        queue: state.packageDesignSelectionQueue,
        selectedDesignsByPackage: state.selectedDesignsByPackage,
        selectionModeByPackage: state.selectionModeByPackage
    });
}

// Design Names and Images (30 designs)
// Usar rutas absolutas desde la raíz para que funcionen desde cualquier ubicación
const designs = [
    { name: 'Muñeco de Nieve 1', image: '/images/chocos/choco_01.webp' },
    { name: 'Oso Polar', image: '/images/chocos/choco_02.webp' },
    { name: 'Choco Paceño', image: '/images/chocos/choco_03.webp' },
    { name: 'Choco Acebo', image: '/images/chocos/choco_04.webp' },
    { name: 'Choco Chispas', image: '/images/chocos/choco_05.webp' },
    { name: 'Grinch Enamorado', image: '/images/chocos/choco_06.webp' },
    { name: 'Papanoel', image: '/images/chocos/choco_07.webp' },
    { name: 'Nieve Rojiza', image: '/images/chocos/choco_08.webp' },
    { name: 'Choco Cacao', image: '/images/chocos/choco_09.webp' },
    { name: 'Blanca Navidad', image: '/images/chocos/choco_10.webp' },
    { name: 'Copo de Nieve', image: '/images/chocos/choco_11.webp' },
    { name: 'Árbol de Navidad', image: '/images/chocos/choco_12.webp' },
    { name: 'Choco Dorado', image: '/images/chocos/choco_13.webp' },
    { name: 'Choco Estrellado', image: '/images/chocos/choco_14.webp' },
    { name: 'Chispas Grinch', image: '/images/chocos/choco_15.webp' },
    { name: 'Muñeco de Nieve 2', image: '/images/chocos/choco_16.webp' },
    { name: 'Choco Colorado', image: '/images/chocos/choco_17.webp' },
    { name: 'Choco GitHub', image: '/images/chocos/choco_18.webp' },
    { name: 'Choco Android', image: '/images/chocos/choco_19.webp' },
    { name: 'ChoKotlin', image: '/images/chocos/choco_20.webp' },
    { name: 'Choco Flutter', image: '/images/chocos/choco_21.webp' },
    { name: 'Choco Swift', image: '/images/chocos/choco_22.webp' },
    { name: 'Choco Python', image: '/images/chocos/choco_23.webp' },
    { name: 'Paceño Yaaaa!', image: '/images/chocos/choco_24.webp' },
    { name: 'Choco Galindo', image: '/images/chocos/choco_25.webp' },
    { name: 'Choco Vice', image: '/images/chocos/choco_26.webp' },
    { name: 'Paceño Utha!', image: '/images/chocos/choco_27.webp' },
    { name: 'Choco Bolivar.', image: '/images/chocos/choco_28.webp' },
    { name: 'Choco Tigre.', image: '/images/chocos/choco_29.webp' },
    { name: 'Choco Bolivia.', image: '/images/chocos/choco_30.webp' }
];

// WhatsApp Number
const whatsappNumber = '59160139013';

// Step Navigation
function showStep(stepNumber) {
    console.log('=== showStep called with:', stepNumber, '===');
    
    // Don't apply validations for step 0 (welcome screen)
    if (stepNumber === 0) {
        // Just show step 0, no validations needed
    } else {
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
    }
    
    // Update browser history to prevent ERR_FILE_NOT_FOUND on back button
    if (window.history && window.history.pushState) {
        try {
            window.history.pushState({ step: stepNumber }, '', window.location.href);
        } catch (e) {
            // Silently fail if pushState is not available
            console.log('History API not available');
        }
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
        
        // Reset scroll to top when changing steps
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
        
        // Also reset scroll on the main container
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.scrollTop = 0;
        }
        
        // Trigger initialization for specific steps
        if (stepNumber === 1 && state.selectedPackages.length === 0) {
            // Reset UI if returning to step 1 with no packages
            setTimeout(() => {
                if (typeof window.resetStep1UI === 'function') {
                    window.resetStep1UI();
                }
            }, 100);
        }
        if (stepNumber === 2 && typeof window.checkStep2 === 'function') {
            setTimeout(() => {
                window.checkStep2();
            }, 50);
        }
        if (stepNumber === 2 && typeof window.updateStep2Title === 'function') {
            setTimeout(() => window.updateStep2Title(), 100);
        }
        if (stepNumber === 3 && typeof window.initializeDesignsStep3 === 'function') {
            setTimeout(() => window.initializeDesignsStep3(), 100);
        }
        if (stepNumber === 4 && typeof window.updateOrderSummaryStep4 === 'function') {
            setTimeout(() => {
                window.updateOrderSummaryStep4();
                // Aplicar cambios del modo personal si es necesario
                // Usar setTimeout para asegurar que el DOM esté completamente renderizado
                setTimeout(() => {
                    if (isPersonalMode && typeof window.applyPersonalModeStep4 === 'function') {
                        console.log('🔧 Ejecutando applyPersonalModeStep4 en modo personal (desde showStep)');
                        // Verificar que el step 4 esté visible antes de buscar los elementos
                        const step4Element = document.getElementById('step4');
                        if (step4Element && step4Element.classList.contains('active')) {
                            console.log('✅ Step 4 está activo, ejecutando applyPersonalModeStep4');
                            window.applyPersonalModeStep4();
                        } else {
                            console.log('⚠️ Step 4 aún no está activo, reintentando en 100ms...');
                            setTimeout(() => {
                                if (typeof window.applyPersonalModeStep4 === 'function') {
                                    window.applyPersonalModeStep4();
                                }
                            }, 100);
                        }
                    }
                    // Verificación adicional: forzar visibilidad de campos si están ocultos
                    if (isPersonalMode) {
                        // Buscar dentro del step 4 activo primero
                        const step4Element = document.getElementById('step4');
                        let dateGroup = null;
                        let timeGroup = null;
                        
                        if (step4Element) {
                            dateGroup = step4Element.querySelector('#deliveryDateGroup');
                            timeGroup = step4Element.querySelector('#deliveryTimeGroup');
                        }
                        
                        // Si no se encuentran, buscar globalmente
                        if (!dateGroup) dateGroup = document.getElementById('deliveryDateGroup');
                        if (!timeGroup) timeGroup = document.getElementById('deliveryTimeGroup');
                        
                        if (dateGroup) {
                            console.log('✅ deliveryDateGroup encontrado en verificación adicional, forzando visibilidad');
                            dateGroup.classList.add('show');
                            dateGroup.style.setProperty('display', 'block', 'important');
                            dateGroup.style.setProperty('visibility', 'visible', 'important');
                            dateGroup.style.setProperty('opacity', '1', 'important');
                        } else {
                            console.error('❌ deliveryDateGroup NO encontrado en verificación adicional');
                        }
                        if (timeGroup) {
                            console.log('✅ deliveryTimeGroup encontrado en verificación adicional, forzando visibilidad');
                            timeGroup.classList.add('show');
                            timeGroup.style.setProperty('display', 'block', 'important');
                            timeGroup.style.setProperty('visibility', 'visible', 'important');
                            timeGroup.style.setProperty('opacity', '1', 'important');
                        } else {
                            console.error('❌ deliveryTimeGroup NO encontrado en verificación adicional');
                        }
                    }
                }, 300); // Aumentado a 300ms para dar más tiempo
                // Ensure scroll is at top after content is updated
                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth'
                });
            }, 100);
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
    const dialogIcon = document.querySelector('.dialog-icon');
    const dialogBtn = document.getElementById('dialogBtn');
    
    if (overlay && dialogTitle && dialogMessage) {
        // Extraer emoji del título si existe
        let cleanTitle = title;
        let icon = '⚠️';
        
        if (title.includes('✅') || title.includes('Éxito')) {
            icon = '✅';
            cleanTitle = title.replace('✅', '').replace('Éxito', 'Éxito').trim();
        } else if (title.includes('❌') || title.includes('Error')) {
            icon = '❌';
            cleanTitle = title.replace('❌', '').replace('Error', 'Error').trim();
        }
        
        dialogTitle.textContent = cleanTitle;
        dialogMessage.textContent = message;
        
        // Cambiar ícono según el tipo de mensaje
        if (dialogIcon) {
            dialogIcon.textContent = icon;
        }
        
        // Mostrar botón de cerrar
        if (dialogBtn) {
            dialogBtn.style.display = 'block';
        }
        
        overlay.classList.add('active');
        
        // Prevent body scroll when dialog is open
        document.body.style.overflow = 'hidden';
    }
}

// Función para mostrar diálogo de progreso
function showProgressDialog(message = 'Procesando tu pedido...') {
    const overlay = document.getElementById('dialogOverlay');
    const dialogTitle = document.getElementById('dialogTitle');
    const dialogMessage = document.getElementById('dialogMessage');
    const dialogIcon = document.querySelector('.dialog-icon');
    const dialogBtn = document.getElementById('dialogBtn');
    
    if (overlay && dialogTitle && dialogMessage) {
        dialogTitle.textContent = '⏳ Procesando';
        dialogMessage.innerHTML = `
            <div style="text-align: center;">
                <div style="margin-bottom: 15px;">
                    <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #c41e3a; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
                <p style="margin: 0;">${message}</p>
            </div>
        `;
        
        if (dialogIcon) {
            dialogIcon.textContent = '⏳';
        }
        
        // Ocultar botón de cerrar durante el progreso
        if (dialogBtn) {
            dialogBtn.style.display = 'none';
        }
        
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Agregar estilo para el spinner si no existe
if (!document.getElementById('spinnerStyle')) {
    const style = document.createElement('style');
    style.id = 'spinnerStyle';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
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
    // Function to reset all selections in step 1
    function resetStep1UI() {
        // Uncheck all checkboxes
        document.querySelectorAll('.package-card input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // j6 now uses jengibrePackagesCount, reset is handled in the loop below
        
        // Reset regular package counters
        state.regularPackagesCount = {};
        [1, 4, 8, 12].forEach(packageId => {
            const counter = document.querySelector(`.package-card[data-package="${packageId}"] .package-counter`);
            if (counter) counter.style.display = 'none';
            const counterValue = document.querySelector(`.counter-value[data-package="${packageId}"]`);
            if (counterValue) counterValue.textContent = '1';
            const priceEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-price-dynamic`);
            if (priceEl) {
                const packageData = packages[packageId];
                priceEl.textContent = `${packageData.price} Bs.`;
            }
            const quantityEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-quantity`);
            if (quantityEl) {
                const packageData = packages[packageId];
                if (packageData.quantity === 1) {
                    quantityEl.textContent = `${packageData.quantity} Chocobomba`;
                } else {
                    quantityEl.textContent = `${packageData.quantity} Chocobombas`;
                }
            }
            const bonusEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-bonus`);
            if (bonusEl && packages[packageId].bonus) {
                bonusEl.textContent = packages[packageId].bonus;
            }
        });
        
        // Reset jengibre package counters (j1, j2, j4, j6)
        state.jengibrePackagesCount = {};
        ['j1', 'j2', 'j4', 'j6'].forEach(packageId => {
            const counter = document.querySelector(`.package-card[data-package="${packageId}"] .package-counter`);
            if (counter) counter.style.display = 'none';
            const counterValue = document.querySelector(`.counter-value[data-package="${packageId}"]`);
            if (counterValue) counterValue.textContent = '1';
            const priceEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-price-dynamic`);
            if (priceEl) {
                const packageData = packages[packageId];
                priceEl.textContent = `${packageData.price} Bs.`;
            }
            const quantityEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-quantity`);
            if (quantityEl) {
                const packageData = packages[packageId];
                if (packageData.quantity === 1) {
                    quantityEl.textContent = `${packageData.quantity} Chocobomba de Jengibre`;
                } else {
                    quantityEl.textContent = `${packageData.quantity} Chocobombas de Jengibre`;
                }
            }
        });
        
        // Remove selected class from all cards
        document.querySelectorAll('.package-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

function initializeStep1() {
    const btnNext1 = document.getElementById('btnNext1');
    if (!btnNext1) {
        console.error('btnNext1 not found!');
        return;
    }
    
    
    // j6 now uses the same counter system as j1, j2, j4
    
    // Make reset function available globally
    window.resetStep1UI = resetStep1UI;

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
        
        // j6 now uses the same system as j1, j2, j4

        const packageData = packages[packageId];
        const card = checkbox.closest('.package-card');

        if (checkbox.checked) {
            
            // For regular packages (1, 4, 8, 12), show counter and initialize to 1
            if (typeof packageId === 'number' && [1, 4, 8, 12].includes(packageId)) {
                if (card) card.classList.add('selected');
                // Initialize counter to 1 if not already set
                if (!state.regularPackagesCount[packageId]) {
                    state.regularPackagesCount[packageId] = 1;
                }
                // Show counter
                const counter = card.querySelector('.package-counter');
                if (counter) counter.style.display = 'flex';
                // Update display
                updateRegularPackageCounterDisplay(packageId);
                // Add to selectedPackages with initial count
                updateRegularPackagesInState();
            } else if (typeof packageId === 'string' && ['j1', 'j2', 'j4', 'j6'].includes(packageId)) {
                // For jengibre packages (j1, j2, j4), show counter and initialize to 1
                if (card) card.classList.add('selected');
                // Initialize counter to 1 if not already set
                if (!state.jengibrePackagesCount[packageId]) {
                    state.jengibrePackagesCount[packageId] = 1;
                }
                // Show counter
                const counter = card.querySelector('.package-counter');
                if (counter) counter.style.display = 'flex';
                // Update display
                updateJengibrePackageCounterDisplay(packageId);
                // Add to selectedPackages with initial count
                updateJengibrePackagesInState();
            } else {
                // For other packages (shouldn't happen, but just in case)
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
            }
        } else {
            // Remove from array
            state.selectedPackages = state.selectedPackages.filter(p => p.packageId !== packageId);
            // For regular packages, hide counter, reset count to 1, and reset price
            if (typeof packageId === 'number' && [1, 4, 8, 12].includes(packageId)) {
                delete state.regularPackagesCount[packageId];
                const counter = card ? card.querySelector('.package-counter') : null;
                if (counter) counter.style.display = 'none';
                
                // Reset counter value to 1
                const counterValue = card ? card.querySelector(`.counter-value[data-package="${packageId}"]`) : null;
                if (counterValue) counterValue.textContent = '1';
                
                // Reset price to original unit price
                const priceEl = card ? card.querySelector(`.package-price-dynamic`) : null;
                if (priceEl) {
                    const packageData = packages[packageId];
                    priceEl.textContent = `${packageData.price} Bs.`;
                }
                
                // Reset quantity to original value
                const quantityEl = card ? card.querySelector('.package-quantity') : null;
                if (quantityEl) {
                    const packageData = packages[packageId];
                    if (packageData.quantity === 1) {
                        quantityEl.textContent = `${packageData.quantity} Chocobomba`;
                    } else {
                        quantityEl.textContent = `${packageData.quantity} Chocobombas`;
                    }
                }
                
                // Reset bonus to original value
                const bonusEl = card ? card.querySelector('.package-bonus') : null;
                if (bonusEl && packages[packageId].bonus) {
                    bonusEl.textContent = packages[packageId].bonus;
                }
                
                updateRegularPackagesInState();
            }
            // For jengibre packages (j1, j2, j4, j6), hide counter, reset count to 1, and reset price
            else if (typeof packageId === 'string' && ['j1', 'j2', 'j4', 'j6'].includes(packageId)) {
                delete state.jengibrePackagesCount[packageId];
                const counter = card ? card.querySelector('.package-counter') : null;
                if (counter) counter.style.display = 'none';
                
                // Reset counter value to 1
                const counterValue = card ? card.querySelector(`.counter-value[data-package="${packageId}"]`) : null;
                if (counterValue) counterValue.textContent = '1';
                
                // Reset price to original unit price
                const priceEl = card ? card.querySelector(`.package-price-dynamic`) : null;
                if (priceEl) {
                    const packageData = packages[packageId];
                    priceEl.textContent = `${packageData.price} Bs.`;
                }
                
                // Reset quantity to original value
                const quantityEl = card ? card.querySelector('.package-quantity') : null;
                if (quantityEl) {
                    const packageData = packages[packageId];
                    if (packageData.quantity === 1) {
                        quantityEl.textContent = `${packageData.quantity} Chocobomba de Jengibre`;
                    } else {
                        quantityEl.textContent = `${packageData.quantity} Chocobombas de Jengibre`;
                    }
                }
                
                updateJengibrePackagesInState();
            }
            if (card) card.classList.remove('selected');
        }

        updateJengibrePackagesInState();
        updateButtonState();
    }

    // j6 now uses handleJengibrePackageCounter and updateJengibrePackageCounterDisplay like j1, j2, j4

    // Function to handle regular package counter (for packages 1, 4, 8, 12)
    function handleRegularPackageCounter(packageId, action) {
        if (![1, 4, 8, 12].includes(packageId)) return;
        
        const currentCount = state.regularPackagesCount[packageId] || 0;
        let newCount = currentCount;
        
        if (action === 'increase') {
            newCount = currentCount + 1;
        } else if (action === 'decrease' && currentCount > 1) {
            newCount = currentCount - 1;
        } else if (action === 'decrease' && currentCount === 1) {
            // If count is 1 and trying to decrease, uncheck the package
            const checkbox = document.querySelector(`input[data-package="${packageId}"]`);
            if (checkbox) {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            }
            return;
        }
        
        state.regularPackagesCount[packageId] = newCount;
        updateRegularPackageCounterDisplay(packageId);
        updateRegularPackagesInState();
        updateButtonState();
        
        // Update order summary if we're on step 4
        if (state.currentStep === 4 && typeof updateOrderSummary === 'function') {
            updateOrderSummary();
        }
    }

    // Update regular package counter display
    function updateRegularPackageCounterDisplay(packageId) {
        if (![1, 4, 8, 12].includes(packageId)) return;
        
        const counterValue = document.querySelector(`.counter-value[data-package="${packageId}"]`);
        const decreaseBtn = document.querySelector(`.counter-btn[data-action="decrease"][data-package="${packageId}"]`);
        const priceEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-price-dynamic`);
        const quantityEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-quantity`);
        const bonusEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-bonus`);
        const card = document.querySelector(`.package-card[data-package="${packageId}"]`);
        
        const count = state.regularPackagesCount[packageId] || 0;
        const packageData = packages[packageId];
        const unitPrice = packageData.price;
        const totalPrice = count * unitPrice;
        const totalQuantity = packageData.quantity * count;
        
        // Update counter value
        if (counterValue) {
            counterValue.textContent = count;
        }
        
        // Update decrease button (disabled if count is 1)
        if (decreaseBtn) {
            decreaseBtn.disabled = count <= 1;
        }
        
        // Update price text
        if (priceEl) {
            priceEl.textContent = `${totalPrice} Bs.`;
        }
        
        // Update quantity text dynamically based on count
        if (quantityEl) {
            if (totalQuantity === 1) {
                quantityEl.textContent = `${totalQuantity} Chocobomba`;
            } else {
                quantityEl.textContent = `${totalQuantity} Chocobombas`;
            }
        }
        
        // Update bonus text dynamically based on count
        if (bonusEl && packageData.bonus) {
            const bonusMatch = packageData.bonus.match(/(\d+)/);
            if (bonusMatch) {
                const originalBonusCount = parseInt(bonusMatch[1]);
                const bonusCount = originalBonusCount * count;
                // Format bonus text with proper plural
                if (bonusCount === 1) {
                    bonusEl.textContent = `+ ${bonusCount} Chocobomba Jengibre de Regalo 🎁`;
                } else {
                    bonusEl.textContent = `+ ${bonusCount} Chocobombas Jengibre de Regalo 🎁`;
                }
            } else {
                bonusEl.textContent = packageData.bonus;
            }
        }
    }

    // Update state.selectedPackages with regular packages
    function updateRegularPackagesInState() {
        // Remove regular packages (1, 4, 8, 12) from selectedPackages
        state.selectedPackages = state.selectedPackages.filter(p => ![1, 4, 8, 12].includes(p.packageId));
        
        // Add regular packages based on count
        [1, 4, 8, 12].forEach(packageId => {
            const count = state.regularPackagesCount[packageId] || 0;
            if (count > 0) {
                const packageData = packages[packageId];
                const totalQuantity = packageData.quantity * count;
                const totalPrice = packageData.price * count;
                
                // Handle bonus (jengibre) - multiply by count
                let bonus = null;
                if (packageData.bonus) {
                    const bonusMatch = packageData.bonus.match(/(\d+)/);
                    if (bonusMatch) {
                        const originalBonusCount = parseInt(bonusMatch[1]);
                        const bonusCount = originalBonusCount * count;
                        // Format bonus text with proper plural
                        if (bonusCount === 1) {
                            bonus = `+ ${bonusCount} Chocobomba Jengibre de Regalo 🎁`;
                        } else {
                            bonus = `+ ${bonusCount} Chocobombas Jengibre de Regalo 🎁`;
                        }
                    } else {
                        bonus = packageData.bonus;
                    }
                }
                
                state.selectedPackages.push({
                    packageId: packageId,
                    quantity: totalQuantity,
                    price: totalPrice,
                    name: packageData.name,
                    bonus: bonus,
                    packageCount: count // Store how many packages of this type
                });
            }
        });
    }

    // Function to handle jengibre package counter (for packages j1, j2, j4, j6)
    function handleJengibrePackageCounter(packageId, action) {
        if (!['j1', 'j2', 'j4', 'j6'].includes(packageId)) return;
        
        const currentCount = state.jengibrePackagesCount[packageId] || 0;
        let newCount = currentCount;
        
        if (action === 'increase') {
            newCount = currentCount + 1;
        } else if (action === 'decrease' && currentCount > 1) {
            newCount = currentCount - 1;
        } else if (action === 'decrease' && currentCount === 1) {
            // If count is 1 and trying to decrease, uncheck the package
            const checkbox = document.querySelector(`input[data-package="${packageId}"]`);
            if (checkbox) {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            }
            return;
        }
        
        state.jengibrePackagesCount[packageId] = newCount;
        updateJengibrePackageCounterDisplay(packageId);
        updateJengibrePackagesInState();
        updateButtonState();
        
        // Update order summary if we're on step 4
        if (state.currentStep === 4 && typeof updateOrderSummary === 'function') {
            updateOrderSummary();
        }
    }

    // Update jengibre package counter display (for j1, j2, j4, j6)
    function updateJengibrePackageCounterDisplay(packageId) {
        if (!['j1', 'j2', 'j4', 'j6'].includes(packageId)) return;
        
        const counterValue = document.querySelector(`.counter-value[data-package="${packageId}"]`);
        const decreaseBtn = document.querySelector(`.counter-btn[data-action="decrease"][data-package="${packageId}"]`);
        const priceEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-price-dynamic`);
        const quantityEl = document.querySelector(`.package-card[data-package="${packageId}"] .package-quantity`);
        const card = document.querySelector(`.package-card[data-package="${packageId}"]`);
        
        const count = state.jengibrePackagesCount[packageId] || 0;
        const packageData = packages[packageId];
        const unitPrice = packageData.price;
        const totalPrice = count * unitPrice;
        const totalQuantity = packageData.quantity * count;
        
        // Update counter value
        if (counterValue) {
            counterValue.textContent = count;
        }
        
        // Update decrease button (disabled if count is 1)
        if (decreaseBtn) {
            decreaseBtn.disabled = count <= 1;
        }
        
        // Update price text
        if (priceEl) {
            priceEl.textContent = `${totalPrice} Bs.`;
        }
        
        // Update quantity text dynamically based on count
        if (quantityEl) {
            if (totalQuantity === 1) {
                quantityEl.textContent = `${totalQuantity} Chocobomba de Jengibre`;
            } else {
                quantityEl.textContent = `${totalQuantity} Chocobombas de Jengibre`;
            }
        }
    }

    // Update state.selectedPackages with jengibre packages
    function updateJengibrePackagesInState() {
        // Remove jengibre packages (j1, j2, j4, j6) from selectedPackages
        state.selectedPackages = state.selectedPackages.filter(p => !['j1', 'j2', 'j4', 'j6'].includes(p.packageId));
        
        // Add j1, j2, j4, j6 packages based on count
        ['j1', 'j2', 'j4', 'j6'].forEach(packageId => {
            const count = state.jengibrePackagesCount[packageId] || 0;
            if (count > 0) {
                const packageData = packages[packageId];
                const totalQuantity = packageData.quantity * count;
                const totalPrice = packageData.price * count;
                
                state.selectedPackages.push({
                    packageId: packageId,
                    quantity: totalQuantity,
                    price: totalPrice,
                    name: packageData.name,
                    bonus: null,
                    packageCount: count // Store how many packages of this type
                });
            }
        });
    }

    // Attach events to all checkboxes (regular packages and j1, j2, j4)
    document.querySelectorAll('.package-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            handlePackageChange(this);
        });
    });

    // Attach click events to package cards (regular packages)
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
    
    // Attach click events to jengibre package cards (j1, j2, j4, j6)
    document.querySelectorAll('.package-card.jengibre-package').forEach(card => {
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

    // Attach events to jengibre package counter buttons (j1, j2, j4, j6)
    document.querySelectorAll('.package-card[data-package="j1"] .counter-btn, .package-card[data-package="j2"] .counter-btn, .package-card[data-package="j4"] .counter-btn, .package-card[data-package="j6"] .counter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            const packageId = this.getAttribute('data-package');
            if (['j1', 'j2', 'j4', 'j6'].includes(packageId)) {
                handleJengibrePackageCounter(packageId, action);
            }
        });
    });
    
    // Attach events to regular package counter buttons (1, 4, 8, 12)
    document.querySelectorAll('.package-card[data-package="1"] .counter-btn, .package-card[data-package="4"] .counter-btn, .package-card[data-package="8"] .counter-btn, .package-card[data-package="12"] .counter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            const packageId = parseInt(this.getAttribute('data-package'));
            if ([1, 4, 8, 12].includes(packageId)) {
                handleRegularPackageCounter(packageId, action);
            }
        });
    });
    
    // j6 now uses the same system as other jengibre packages
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
            // Has regular packages (including custom)
            const uniqueTypes = getUniqueRegularPackageTypes();
            if (uniqueTypes.length === 1) {
                // Only one type of package, use normal flow
                state.currentPackageDesignSelection = null; // No specific package
                showStep(2);
            } else {
                // Multiple types of packages, initialize queue and start with first package
                initializePackageDesignQueue();
                if (state.packageDesignSelectionQueue.length > 0) {
                    state.currentPackageDesignSelection = state.packageDesignSelectionQueue[0];
                    showStep(2); // Show step 2 with current package name
                } else {
                    showStep(4);
                }
            }
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
    const stepTitle = document.querySelector('#step2 .step-title');
    const stepSubtitle = document.querySelector('#step2 .step-subtitle');

    // Helper function to get singular form of package name (for display in step 2)
    function getSingularPackageName(packageName) {
        // Return the full package name in uppercase (e.g., "PAQUETE INDIVIDUAL")
        return packageName.toUpperCase();
    }
    
    // Update title and subtitle dynamically based on current package
    function updateStep2Title() {
        const currentPackageId = state.currentPackageDesignSelection;
        if (currentPackageId) {
            // Multiple packages: show specific package name
            const currentPackage = state.selectedPackages.find(p => p.packageId === currentPackageId);
            if (currentPackage && stepTitle) {
                const packageType = getSingularPackageName(currentPackage.name);
                stepTitle.innerHTML = `¿Cómo quieres tus chocobombas del<br><span style="color: var(--accent-gold); font-size: 1.8em; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(218, 165, 32, 0.5); display: block; margin-top: 0.5rem;">${packageType.toUpperCase()}</span>?`;
            }
            if (stepSubtitle) {
                stepSubtitle.textContent = 'Elige surtido o diseños específicos para este tipo de paquete';
            }
        } else {
            // Single package: use generic title
            if (stepTitle) {
                stepTitle.textContent = '¿Cómo quieres tus chocobombas?';
            }
            if (stepSubtitle) {
                stepSubtitle.textContent = 'Elige surtido o diseños específicos';
            }
        }
    }

    // Only show step 2 if there are regular packages
    // This check happens when step 2 is shown
    function checkIfStep2ShouldBeShown() {
        if (!hasRegularPackages()) {
            // If no regular packages, skip to step 4
            showStep(4);
            return false;
        }
        
        const currentPackageId = state.currentPackageDesignSelection;
        console.log('checkIfStep2ShouldBeShown - currentPackageId:', currentPackageId);
        console.log('checkIfStep2ShouldBeShown - selectionModeByPackage:', state.selectionModeByPackage);
        
        // CRITICAL: Always reset mode card selections FIRST when step is shown
        // This ensures clean state for new package
        modeCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        // Hide next button initially
        if (btnNext2) {
            btnNext2.style.display = 'none';
        }
        
        // Update title when step is shown
        updateStep2Title();
        
        // Now check if current package already has a mode selected
        let selectedMode = null;
        
        if (currentPackageId !== null && currentPackageId !== undefined) {
            // Multiple packages mode: check if THIS specific package has a mode selected
            // Use explicit check to ensure we only get the mode for THIS package
            if (state.selectionModeByPackage.hasOwnProperty(currentPackageId)) {
                selectedMode = state.selectionModeByPackage[currentPackageId];
            } else {
                selectedMode = null; // Explicitly set to null if not found
            }
        } else {
            // Single package mode: use global selectionMode
            selectedMode = state.selectionMode || null;
        }
        
        console.log('checkIfStep2ShouldBeShown - selectedMode for current package:', selectedMode);
        
        // Only mark cards if THIS specific package has a mode selected (not null/undefined)
        if (selectedMode !== null && selectedMode !== undefined && btnNext2) {
            if (selectedMode === 'surtido') {
                // Only show button and highlight card if THIS package has surtido selected
                btnNext2.style.display = 'inline-block';
                modeCards.forEach(card => {
                    if (card.dataset.mode === 'surtido') {
                        card.classList.add('selected');
                    }
                });
            } else if (selectedMode === 'especifico') {
                // If especifico is selected, don't show button (will navigate automatically)
                btnNext2.style.display = 'none';
                modeCards.forEach(card => {
                    if (card.dataset.mode === 'especifico') {
                        card.classList.add('selected');
                    }
                });
            }
        }
        // If selectedMode is null/undefined, nothing is marked (clean state)
        
        return true;
    }

    // Create or get next button for step 2
    let btnNext2 = document.getElementById('btnNext2');
    if (!btnNext2) {
        btnNext2 = document.createElement('button');
        btnNext2.id = 'btnNext2';
        btnNext2.className = 'btn-next';
        btnNext2.textContent = 'Continuar →';
        const stepActions = document.querySelector('#step2 .step-actions');
        if (stepActions) {
            stepActions.appendChild(btnNext2);
        }
    }
    // Initially hide the button
    if (btnNext2) {
        btnNext2.style.display = 'none';
    }

    // Function to handle next button click
    function handleNextFromStep2() {
        const currentPackageId = state.currentPackageDesignSelection;
        const selectedMode = currentPackageId 
            ? state.selectionModeByPackage[currentPackageId] 
            : state.selectionMode;

        if (!selectedMode) {
            showDialog('Atención', 'Por favor, selecciona una opción antes de continuar');
            return;
        }

        if (selectedMode === 'surtido') {
            if (currentPackageId) {
                // Multiple packages: move to next package or step 4
                const currentIndex = state.packageDesignSelectionQueue.indexOf(currentPackageId);
                if (currentIndex >= 0 && currentIndex < state.packageDesignSelectionQueue.length - 1) {
                    // There's another package type to configure
                    state.currentPackageDesignSelection = state.packageDesignSelectionQueue[currentIndex + 1];
                    showStep(2); // Reload step 2 with next package
                } else {
                    // All packages configured, go to step 4
                    showStep(4);
                }
            } else {
                // Single package: go directly to step 4
                showStep(4);
            }
        } else if (selectedMode === 'especifico') {
            // If especifico, go to design selection for current package
            if (currentPackageId) {
                // Multiple packages: go to step 3 for current package
                showStep(3);
            } else {
                // Single package: initialize queue and go to step 3
                initializePackageDesignQueue();
                if (state.packageDesignSelectionQueue.length > 0) {
                    state.currentPackageDesignSelection = state.packageDesignSelectionQueue[0];
                    showStep(3);
                } else {
                    showStep(4);
                }
            }
        }
    }

    btnNext2.addEventListener('click', handleNextFromStep2);

    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            // Only allow selection if there are regular packages
            if (!hasRegularPackages()) {
                showStep(4);
                return;
            }

            modeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const selectedMode = card.dataset.mode;
            
            const currentPackageId = state.currentPackageDesignSelection;
            
            // Store selection mode for current package (if multiple packages) or global (if single)
            if (currentPackageId) {
                state.selectionModeByPackage[currentPackageId] = selectedMode;
            } else {
                state.selectionMode = selectedMode;
            }

            // If especifico, navigate immediately to design selection
            if (selectedMode === 'especifico') {
                if (currentPackageId) {
                    // Multiple packages: go to step 3 for current package
                    showStep(3);
                } else {
                    // Single package: initialize queue and go to step 3
                    initializePackageDesignQueue();
                    if (state.packageDesignSelectionQueue.length > 0) {
                        state.currentPackageDesignSelection = state.packageDesignSelectionQueue[0];
                        showStep(3);
                    } else {
                        showStep(4);
                    }
                }
            } else if (selectedMode === 'surtido') {
                // If surtido, navigate immediately to next package or step 4
                if (currentPackageId) {
                    // Multiple packages: move to next package or step 4
                    const currentIndex = state.packageDesignSelectionQueue.indexOf(currentPackageId);
                    if (currentIndex >= 0 && currentIndex < state.packageDesignSelectionQueue.length - 1) {
                        // There's another package type to configure
                        state.currentPackageDesignSelection = state.packageDesignSelectionQueue[currentIndex + 1];
                        showStep(2); // Reload step 2 with next package
                    } else {
                        // All packages configured, go to step 4
                        showStep(4);
                    }
                } else {
                    // Single package: go directly to step 4
                    showStep(4);
                }
            }
        });
    });

    btnBack2.addEventListener('click', () => {
        const currentPackageId = state.currentPackageDesignSelection;
        if (currentPackageId) {
            // Multiple packages: go back to previous package or step 1
            const currentIndex = state.packageDesignSelectionQueue.indexOf(currentPackageId);
            if (currentIndex > 0) {
                // Go to previous package
                state.currentPackageDesignSelection = state.packageDesignSelectionQueue[currentIndex - 1];
                showStep(2);
            } else {
                // Go back to step 1
                showStep(1);
            }
        } else {
            // Single package: go back to step 1
            showStep(1);
        }
    });

    // Store check function globally for showStep to use
    window.checkStep2 = checkIfStep2ShouldBeShown;
    window.updateStep2Title = updateStep2Title;
}

// Step 3: Design Selection (Dynamic per package type)
function initializeStep3() {
    const btnBack3 = document.getElementById('btnBack3');
    const btnNext3 = document.getElementById('btnNext3');
    const designsGrid = document.getElementById('designsGrid');
    const remainingCountEl = document.getElementById('remainingCount');
    const stepTitle = document.querySelector('#step3 .step-title');
    const stepSubtitle = document.querySelector('#step3 .step-subtitle');

    // Function to initialize designs (called when step 3 is shown)
    function initializeDesigns() {
        // Get current package type being configured
        let currentPackageId = state.currentPackageDesignSelection;
        if (!currentPackageId) {
            // No package selected, check if single package mode
            const uniqueTypes = getUniqueRegularPackageTypes();
            if (uniqueTypes.length === 1 && state.selectionMode === 'especifico') {
                // Single package in specific mode, use it
                currentPackageId = uniqueTypes[0];
                state.currentPackageDesignSelection = currentPackageId;
            } else {
                // No valid package, go to step 4
                showStep(4);
                return;
            }
        }

        const currentPackage = state.selectedPackages.find(p => p.packageId === currentPackageId);
        if (!currentPackage) {
            showStep(4);
            return;
        }

        // Helper function to get plural form of package name
        function getPluralPackageName(packageName, count) {
            if (count === 1) {
                return packageName.toLowerCase();
            }
            
            // Map of singular to plural forms
            const pluralMap = {
                'Paquete Individual': 'paquetes individuales',
                'Paquete Familiar': 'paquetes familiares',
                'Paquete Grande': 'paquetes grandes',
                'Paquete Extra Grande': 'paquetes extra grandes',
                'Paquete personalizado': 'paquetes personalizados'
            };
            
            return pluralMap[packageName] || packageName.toLowerCase() + 's';
        }
        
        // Helper function to get singular form of package name (for display)
        function getSingularPackageNameForDisplay(packageName) {
            // Return the full package name (e.g., "Paquete Individual")
            return packageName;
        }
        
        // Update title and subtitle dynamically
        const packageCount = getPackageCountForType(currentPackageId);
        const packageName = currentPackage.name;
        const packageQuantity = currentPackage.quantity;
        
        if (stepTitle) {
            if (packageCount > 1) {
                const pluralName = getPluralPackageName(packageName, packageCount);
                // Use full plural name (e.g., "PAQUETES GRANDES")
                stepTitle.innerHTML = `Selecciona los diseños para tus ${packageCount}<br><span style="color: var(--accent-gold); font-size: 1.8em; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(218, 165, 32, 0.5); display: block; margin-top: 0.5rem; text-align: center;">${pluralName.toUpperCase()}</span>`;
            } else {
                const packageType = getSingularPackageNameForDisplay(packageName);
                stepTitle.innerHTML = `Selecciona los diseños para tu<br><span style="color: var(--accent-gold); font-size: 1.8em; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3), 0 0 10px rgba(218, 165, 32, 0.5); display: block; margin-top: 0.5rem; text-align: center;">${packageType.toUpperCase()}</span>`;
            }
        }
        
        if (stepSubtitle) {
            const pluralName = packageCount > 1 ? getPluralPackageName(packageName, packageCount) : packageName;
            let packageType;
            if (packageCount > 1) {
                // Use full plural name
                packageType = pluralName;
            } else {
                packageType = getSingularPackageNameForDisplay(packageName);
            }
            stepSubtitle.innerHTML = `Elige ${packageQuantity} diseño${packageQuantity > 1 ? 's' : ''} para ${packageCount > 1 ? 'tus' : 'tu'} <span style="color: var(--accent-gold); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);">${packageType.toUpperCase()}</span>`;
        }

        // Initialize selectedDesignsByPackage for this package if not exists
        if (!state.selectedDesignsByPackage[currentPackageId]) {
            state.selectedDesignsByPackage[currentPackageId] = {};
        }
        // Initialize surtidoRemainingByPackage for this package if not exists
        if (!state.surtidoRemainingByPackage[currentPackageId]) {
            state.surtidoRemainingByPackage[currentPackageId] = 0;
        }

        function calculateTotalQuantity() {
            // Return quantity for current package type
            return packageQuantity;
        }

        function calculateSelectedQuantity() {
            const designsForPackage = state.selectedDesignsByPackage[currentPackageId] || {};
            return Object.values(designsForPackage).reduce((sum, qty) => sum + qty, 0);
        }

        function updateRemainingCount() {
            const total = calculateTotalQuantity();
            const selected = calculateSelectedQuantity();
            const surtidoRemaining = state.surtidoRemainingByPackage[currentPackageId] || 0;
            const remaining = total - selected - surtidoRemaining;
            
            if (remainingCountEl) {
                remainingCountEl.textContent = remaining;
            }
            
            // Update footer
            updateStep3Footer();
            
            // Button is always enabled now, just update design cards
            updateDesignCards();
        }
        
        function updateStep3Footer() {
            const footer = document.getElementById('step3Footer');
            const remainingTotalCountEl = document.getElementById('remainingTotalCount');
            const checkboxRemainingSurtido = document.getElementById('checkboxRemainingSurtido');
            
            if (!footer || !remainingTotalCountEl || !checkboxRemainingSurtido) return;
            
            const total = calculateTotalQuantity();
            const selected = calculateSelectedQuantity();
            const surtidoRemaining = state.surtidoRemainingByPackage[currentPackageId] || 0;
            const remaining = total - selected - surtidoRemaining;
            
            // Always show footer, just update the count and checkbox state
            footer.style.display = 'flex';
            remainingTotalCountEl.textContent = remaining;
            
            // Update checkbox state based on whether remaining are marked as surtido
            checkboxRemainingSurtido.checked = surtidoRemaining > 0;
            
            // Checkbox should always be enabled (can toggle even if remaining is 0, to uncheck if needed)
            checkboxRemainingSurtido.disabled = false;
        }

        function updateDesignCards() {
            const total = calculateTotalQuantity();
            const selected = calculateSelectedQuantity();
            const surtidoRemaining = state.surtidoRemainingByPackage[currentPackageId] || 0;
            const remaining = total - selected - surtidoRemaining;
            const designsForPackage = state.selectedDesignsByPackage[currentPackageId] || {};
            const isSurtidoChecked = surtidoRemaining > 0;

            document.querySelectorAll('.design-card').forEach(card => {
                const designId = parseInt(card.dataset.designId);
                const currentQty = designsForPackage[designId] || 0;
                const counterValue = card.querySelector('.counter-value');
                const decreaseBtn = card.querySelector('[data-action="decrease"]');
                const increaseBtn = card.querySelector('[data-action="increase"]');
                
                if (counterValue) {
                    counterValue.textContent = currentQty;
                }

                if (isSurtidoChecked) {
                    // If surtido checkbox is checked: disable cards that have 0 quantity, keep enabled those with quantity
                    if (currentQty === 0) {
                        // Disable cards with no selection
                        card.classList.add('disabled');
                        if (decreaseBtn) decreaseBtn.disabled = true;
                        if (increaseBtn) increaseBtn.disabled = true;
                    } else {
                        // Keep enabled cards with selections (can decrease)
                        card.classList.remove('disabled');
                        if (decreaseBtn) decreaseBtn.disabled = false; // Can decrease
                        if (increaseBtn) increaseBtn.disabled = true; // Cannot increase (all remaining are surtido)
                    }
                } else {
                    // Normal behavior: update based on remaining
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
                }
            });
        }

        // Clear and populate designs grid
        designsGrid.innerHTML = '';
        const designsForPackage = state.selectedDesignsByPackage[currentPackageId] || {};
        
        designs.forEach((design, index) => {
            const designCard = document.createElement('div');
            designCard.className = 'design-card';
            designCard.dataset.designId = index;
            const currentQty = designsForPackage[index] || 0;
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
                const currentQty = designsForPackage[index] || 0;
                if (currentQty > 0) {
                    designsForPackage[index] = currentQty - 1;
                    if (designsForPackage[index] === 0) {
                        delete designsForPackage[index];
                    }
                    state.selectedDesignsByPackage[currentPackageId] = designsForPackage;
                    updateRemainingCount();
                }
            });
            
            increaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const total = calculateTotalQuantity();
                const selected = calculateSelectedQuantity();
                const surtidoRemaining = state.surtidoRemainingByPackage[currentPackageId] || 0;
                const remaining = total - selected - surtidoRemaining;
                if (remaining > 0) {
                    designsForPackage[index] = (designsForPackage[index] || 0) + 1;
                    state.selectedDesignsByPackage[currentPackageId] = designsForPackage;
                    updateRemainingCount();
                }
            });
            
            designsGrid.appendChild(designCard);
        });
        
        updateRemainingCount();
        
        // Set up checkbox event listener after designs are initialized
        const checkboxRemainingSurtido = document.getElementById('checkboxRemainingSurtido');
        if (checkboxRemainingSurtido) {
            // Remove any existing listeners by cloning and replacing
            const newCheckbox = checkboxRemainingSurtido.cloneNode(true);
            checkboxRemainingSurtido.parentNode.replaceChild(newCheckbox, checkboxRemainingSurtido);
            
            newCheckbox.addEventListener('change', (e) => {
                console.log('Checkbox changed:', e.target.checked, 'currentPackageId:', currentPackageId);
                const total = calculateTotalQuantity();
                const selected = calculateSelectedQuantity();
                const currentSurtidoRemaining = state.surtidoRemainingByPackage[currentPackageId] || 0;
                const remaining = total - selected - currentSurtidoRemaining;
                
                console.log('Total:', total, 'Selected:', selected, 'Current Surtido:', currentSurtidoRemaining, 'Remaining:', remaining);
                
                if (e.target.checked) {
                    // Checkbox checked: mark remaining as surtido
                    if (remaining > 0) {
                        state.surtidoRemainingByPackage[currentPackageId] = currentSurtidoRemaining + remaining;
                        console.log('Marked as surtido:', state.surtidoRemainingByPackage[currentPackageId]);
                    }
                } else {
                    // Checkbox unchecked: remove surtido marking for remaining
                    state.surtidoRemainingByPackage[currentPackageId] = 0;
                    console.log('Removed surtido marking');
                }
                
                // Update design cards state (will handle enabling/disabling based on checkbox state)
                updateDesignCards();
                updateRemainingCount();
            });
        }
    }

    // Make initializeDesigns available globally for showStep
    window.initializeDesignsStep3 = initializeDesigns;

    btnBack3.addEventListener('click', () => {
        // Go back to step 2 (mode selection) for current package
        showStep(2);
    });

    btnNext3.addEventListener('click', () => {
        const currentPackageId = state.currentPackageDesignSelection;
        if (!currentPackageId) {
            showStep(4);
            return;
        }
        
        const designsForPackage = state.selectedDesignsByPackage[currentPackageId] || {};
        const selected = Object.values(designsForPackage).reduce((sum, qty) => sum + qty, 0);
        const surtidoRemaining = state.surtidoRemainingByPackage[currentPackageId] || 0;
        const currentPackage = state.selectedPackages.find(p => p.packageId === currentPackageId);
        const total = currentPackage ? currentPackage.quantity : 0;
        const accounted = selected + surtidoRemaining;
        
        if (total === accounted) {
            // Move to next package type in queue
            const currentIndex = state.packageDesignSelectionQueue.indexOf(currentPackageId);
            if (currentIndex >= 0 && currentIndex < state.packageDesignSelectionQueue.length - 1) {
                // There's another package type to configure
                // Check if next package already has a selection mode
                const nextPackageId = state.packageDesignSelectionQueue[currentIndex + 1];
                const nextPackageMode = state.selectionModeByPackage[nextPackageId];
                
                if (nextPackageMode === 'surtido') {
                    // Next package is surtido, skip to the one after or step 4
                    if (currentIndex + 1 < state.packageDesignSelectionQueue.length - 1) {
                        // There's another package after this one
                        state.currentPackageDesignSelection = state.packageDesignSelectionQueue[currentIndex + 2];
                        showStep(2); // Go to step 2 for next package
                    } else {
                        // All packages configured, go to step 4
                        showStep(4);
                    }
                } else if (nextPackageMode === 'especifico') {
                    // Next package needs design selection
                    state.currentPackageDesignSelection = nextPackageId;
                    showStep(3); // Reload step 3 with next package
                } else {
                    // Next package hasn't selected mode yet, go to step 2
                    state.currentPackageDesignSelection = nextPackageId;
                    showStep(2); // Go to step 2 for next package
                }
            } else {
                // All package types configured, go to step 4
                showStep(4);
            }
        } else {
            const remaining = total - accounted;
            showDialog('Atención', `Por favor, selecciona ${remaining} diseño${remaining > 1 ? 's' : ''} más o marca el restante como surtido antes de continuar`);
        }
    });
}

// Step 4: Final Form
function initializeStep4() {
    const btnBack4 = document.getElementById('btnBack4');
    const btnSubmit = document.getElementById('btnSubmit');
    const orderForm = document.getElementById('orderForm');
    const orderSummary = document.getElementById('orderSummary');

    // State for price editing mode (only in personal mode) - persistent across updates
    let priceEditingMode = false;
    
    // Store references to packages for price editing
    let currentRegularPackages = [];
    let currentJengibreGroups = {};

    // Helper function to get package image
    // Usar rutas absolutas desde la raíz para que funcionen desde cualquier ubicación
    function getPackageImage(packageId) {
        const imageMap = {
            1: '/images/packs/pack-x1.png',
            4: '/images/packs/pack-x4.png',
            8: '/images/packs/pack-x8.png',
            12: '/images/packs/pack-x12.png',
            j1: '/images/packs/pack-jengibres-x1.png',
            j2: '/images/packs/pack-jengibres-x2.png',
            j4: '/images/packs/pack-jengibres-x4.png',
            j6: '/images/packs/pack-jengibres-x6.png',
        };
        return imageMap[packageId] || '';
    }

    // Function to remove a package from the order
    function removePackage(packageIndex) {
        const packageToRemove = state.selectedPackages[packageIndex];
        if (!packageToRemove) return;
        
        // If it's a regular package and we have specific designs, we need to recalculate designs
        if (!isJengibrePackage(packageToRemove.packageId) && state.selectionMode === 'especifico') {
            // Calculate the quantity being removed
            const removedQuantity = packageToRemove.quantity;
            const currentDesignTotal = Object.values(state.selectedDesigns).reduce((sum, qty) => sum + qty, 0);
            const totalRegularQuantity = getRegularPackagesQuantity();
            const newTotalQuantity = totalRegularQuantity - removedQuantity;
            
            // If removing this package would make designs exceed available quantity, adjust proportionally
            if (currentDesignTotal > newTotalQuantity && newTotalQuantity > 0) {
                // Calculate ratio to adjust designs
                const ratio = newTotalQuantity / totalRegularQuantity;
                Object.keys(state.selectedDesigns).forEach(designId => {
                    const currentQty = state.selectedDesigns[designId];
                    const newQty = Math.floor(currentQty * ratio);
                    if (newQty > 0) {
                        state.selectedDesigns[designId] = newQty;
                    } else {
                        delete state.selectedDesigns[designId];
                    }
                });
            } else if (newTotalQuantity === 0) {
                // No more regular packages, clear all designs
                state.selectedDesigns = {};
                state.selectionMode = null;
            }
        } else if (!isJengibrePackage(packageToRemove.packageId) && !hasRegularPackages()) {
            // If this was the last regular package, clear selection mode and designs
            state.selectionMode = null;
            state.selectedDesigns = {};
        }
        
        // Remove the package
        state.selectedPackages.splice(packageIndex, 1);
        
        // If no packages left, go back to step 1 and reset everything
        if (state.selectedPackages.length === 0) {
            state.selectionMode = null;
            state.selectedDesigns = {};
            state.jengibrePackages = {};
            showStep(1);
            // Reset UI after a short delay to ensure DOM is ready
            setTimeout(() => {
                if (typeof window.resetStep1UI === 'function') {
                    window.resetStep1UI();
                }
            }, 100);
            return;
        }
        
        // Update the summary
        updateOrderSummary();
    }

    function updateOrderSummary() {
        let summaryHTML = '';
        let totalPrice = 0;
        let regularPackages = [];
        let jengibrePackages = [];

        // Separate packages by type and add index for removal
        state.selectedPackages.forEach((pkg, index) => {
            const pkgWithIndex = { ...pkg, originalIndex: index };
            if (isJengibrePackage(pkg.packageId)) {
                jengibrePackages.push(pkgWithIndex);
            } else {
                regularPackages.push(pkgWithIndex);
            }
            totalPrice += pkg.price;
        });
        
        // Store for price editing
        currentRegularPackages = regularPackages;
        
        // Add price editing controls for personal mode
        if (isPersonalMode) {
            summaryHTML += `
                <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 10px;">
                    <div>
                        <h4 style="margin: 0; color: var(--text-primary);">Edición de Precios</h4>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--text-secondary);">Habilita la edición para modificar precios acordados</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="btnTogglePriceEdit" class="btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 8px; border: 2px solid var(--accent-green); background: ${priceEditingMode ? 'var(--accent-green)' : 'transparent'}; color: ${priceEditingMode ? 'white' : 'var(--accent-green)'}; font-weight: 600; cursor: pointer;">
                            ${priceEditingMode ? '✏️ Modo Edición' : '💰 Recalcular Precio'}
                        </button>
                        ${priceEditingMode ? `
                            <button id="btnSavePrices" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px; background: var(--accent-green); color: white; font-weight: 600; cursor: pointer; border: none;">
                                💾 Guardar y Recalcular
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Show regular packages first
        if (regularPackages.length > 0) {
            summaryHTML += '<div style="margin-bottom: 1.5rem;"><h4 style="color: var(--accent-green); font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">Chocobombas</h4>';
            
            // Group packages by type to show designs together
            const uniqueTypes = getUniqueRegularPackageTypes();
            const uniqueTypesMap = {};
            uniqueTypes.forEach(packageId => {
                uniqueTypesMap[packageId] = regularPackages.filter(p => p.packageId === packageId);
            });
            
            // Show each unique package type with its designs
            uniqueTypes.forEach(packageId => {
                const packagesOfType = uniqueTypesMap[packageId];
                if (packagesOfType && packagesOfType.length > 0) {
                    // Show the package card(s) for this type
                    packagesOfType.forEach(pkg => {
                        const packageImage = getPackageImage(pkg.packageId);
                        summaryHTML += `
                            <div class="summary-item summary-item-with-image" data-package-index="${pkg.originalIndex}">
                                <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                                    ${packageImage ? `<img src="${packageImage}" alt="${pkg.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">` : ''}
                                    <div>
                                        <h4 style="margin: 0;">${pkg.name}</h4>
                                        <p style="margin: 0;">${pkg.quantity} chocobombas${pkg.bonus ? ` <span style="color: var(--accent-gold); font-weight: 600;">${pkg.bonus}</span>` : ''}</p>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    ${isPersonalMode && priceEditingMode ? `
                                        <input type="number" 
                                               id="price-edit-${pkg.originalIndex}" 
                                               value="${pkg.price}" 
                                               min="0" 
                                               step="0.01" 
                                               style="width: 100px; padding: 0.5rem; border: 2px solid var(--accent-green); border-radius: 6px; font-weight: 600; text-align: center;"
                                               data-package-index="${pkg.originalIndex}">
                                        <span style="font-weight: 600; color: var(--accent-green);">Bs.</span>
                                    ` : `
                                        <p style="font-weight: 600; color: var(--accent-green); margin: 0;">${pkg.price} Bs.</p>
                                    `}
                                    <button class="remove-item-btn" onclick="removePackageFromOrder(${pkg.originalIndex})" title="Eliminar producto" aria-label="Eliminar ${pkg.name}">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    
                    // Show designs for this package type immediately after
                    const surtidoRemaining = state.surtidoRemainingByPackage[packageId] || 0;
                    
                    // Determine the selection mode for this package
                    let packageMode = null;
                    if (uniqueTypes.length === 1) {
                        // Single package type: use global selectionMode
                        packageMode = state.selectionMode;
                    } else {
                        // Multiple package types: use package-specific mode
                        packageMode = state.selectionModeByPackage[packageId];
                    }
                    
                    // Show designs based on the mode
                    if (packageMode === 'especifico') {
                        const designsForPackage = state.selectedDesignsByPackage[packageId] || {};
                        if (Object.keys(designsForPackage).length > 0) {
                            summaryHTML += `<div class="summary-item" style="margin-top: 0.5rem; padding-left: 1rem;"><h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Diseños:</h4></div>`;
                            Object.entries(designsForPackage).forEach(([designId, quantity]) => {
                                if (quantity > 0) {
                                    const design = designs[parseInt(designId)];
                                    summaryHTML += `
                                        <div class="summary-item summary-item-with-image" style="padding-left: 1rem;">
                                            <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                                                <img src="${design.image}" alt="${design.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
                                                <p style="margin: 0;">${design.name}</p>
                                            </div>
                                            <div>
                                                <p style="font-weight: 600; margin: 0;">x${quantity}</p>
                                            </div>
                                        </div>
                                    `;
                                }
                            });
                        }
                        // Show surtido remaining if any (always show below selected designs)
                        if (surtidoRemaining > 0) {
                            summaryHTML += `
                                <div class="summary-item summary-item-with-image" style="margin-top: 0.5rem; padding-left: 1rem;">
                                    <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); border-radius: 8px; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🎲</div>
                                        <p style="margin: 0;">Surtido</p>
                                    </div>
                                    <div>
                                        <p style="font-weight: 600; margin: 0;">x${surtidoRemaining}</p>
                                    </div>
                                </div>
                            `;
                        }
                    } else if (packageMode === 'surtido') {
                        summaryHTML += `
                            <div class="summary-item" style="margin-top: 0.5rem; padding-left: 1rem;">
                                <p><strong>Tipo:</strong> Surtido (diseños variados)</p>
                            </div>
                        `;
                    }
                }
            });
            
            summaryHTML += '</div>';
        }

        // Show jengibre packages (grouped by type)
        if (jengibrePackages.length > 0) {
            summaryHTML += '<div style="margin-bottom: 1.5rem;"><h4 style="color: var(--accent-green); font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">Chocobombas de Jengibre</h4>';
            
            // Group jengibre packages by packageId
            const jengibreGroups = {};
            currentJengibreGroups = {}; // Reset
            jengibrePackages.forEach(pkg => {
                if (!jengibreGroups[pkg.packageId]) {
                    jengibreGroups[pkg.packageId] = {
                        packageId: pkg.packageId,
                        name: pkg.name,
                        quantity: 0,
                        price: 0,
                        packageCount: 0,
                        unitPrice: pkg.price,
                        unitQuantity: pkg.quantity,
                        originalIndices: [] // Store indices for price editing
                    };
                }
                jengibreGroups[pkg.packageId].quantity += pkg.quantity;
                jengibreGroups[pkg.packageId].price += pkg.price;
                jengibreGroups[pkg.packageId].originalIndices.push(pkg.originalIndex);
                if (pkg.packageCount) {
                    jengibreGroups[pkg.packageId].packageCount += pkg.packageCount;
                } else {
                    // For j6, calculate package count from quantity
                    if (pkg.packageId === 'j6') {
                        jengibreGroups[pkg.packageId].packageCount += pkg.quantity / 6;
                    } else {
                        jengibreGroups[pkg.packageId].packageCount += 1;
                    }
                }
            });
            
            // Store for price editing
            currentJengibreGroups = jengibreGroups;
            
            // Display grouped packages
            Object.values(jengibreGroups).forEach(group => {
                const count = group.packageCount || (group.quantity / group.unitQuantity);
                const countText = count > 1 ? ` (x${count})` : '';
                const packageImage = getPackageImage(group.packageId);
                // Find all indices of packages with this packageId
                const packageIndices = state.selectedPackages
                    .map((pkg, idx) => pkg.packageId === group.packageId ? idx : -1)
                    .filter(idx => idx !== -1);
                summaryHTML += `
                    <div class="summary-item summary-item-with-image">
                        <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                            ${packageImage ? `<img src="${packageImage}" alt="${group.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">` : ''}
                            <div>
                                <h4 style="margin: 0;">${group.name}${countText}</h4>
                                <p style="margin: 0;">${group.quantity} chocobombas de jengibre</p>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            ${isPersonalMode && priceEditingMode ? `
                                <input type="number" 
                                       id="price-edit-jengibre-${group.packageId}" 
                                       value="${group.price}" 
                                       min="0" 
                                       step="0.01" 
                                       style="width: 100px; padding: 0.5rem; border: 2px solid var(--accent-green); border-radius: 6px; font-weight: 600; text-align: center;"
                                       data-package-id="${group.packageId}">
                                <span style="font-weight: 600; color: var(--accent-green);">Bs.</span>
                            ` : `
                                <p style="font-weight: 600; color: var(--accent-green); margin: 0;">${group.price} Bs.</p>
                            `}
                            <button class="remove-item-btn" onclick="removeJengibrePackageFromOrder('${group.packageId}')" title="Eliminar producto" aria-label="Eliminar ${group.name}">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            });
            summaryHTML += '</div>';
        }

        summaryHTML += `
            <div class="summary-total">
                <h3>Total</h3>
                <h3 id="orderTotalPrice" style="color: var(--accent-green);">${totalPrice} Bs.</h3>
            </div>
        `;

        orderSummary.innerHTML = summaryHTML;
        
        // Add event listeners for price editing (only in personal mode)
        if (isPersonalMode) {
            const btnTogglePriceEdit = document.getElementById('btnTogglePriceEdit');
            const btnSavePrices = document.getElementById('btnSavePrices');
            
            if (btnTogglePriceEdit) {
                // Remove old listeners by cloning
                const newBtn = btnTogglePriceEdit.cloneNode(true);
                btnTogglePriceEdit.parentNode.replaceChild(newBtn, btnTogglePriceEdit);
                
                newBtn.addEventListener('click', () => {
                    priceEditingMode = !priceEditingMode;
                    updateOrderSummary(); // Re-render with new mode
                });
            }
            
            if (btnSavePrices) {
                // Remove old listeners by cloning
                const newSaveBtn = btnSavePrices.cloneNode(true);
                btnSavePrices.parentNode.replaceChild(newSaveBtn, btnSavePrices);
                
                newSaveBtn.addEventListener('click', () => {
                    // Update prices from input fields
                    let newTotal = 0;
                    
                    // Update regular packages
                    currentRegularPackages.forEach(pkg => {
                        const priceInput = document.getElementById(`price-edit-${pkg.originalIndex}`);
                        if (priceInput) {
                            const newPrice = parseFloat(priceInput.value) || 0;
                            if (state.selectedPackages[pkg.originalIndex]) {
                                state.selectedPackages[pkg.originalIndex].price = newPrice;
                            }
                            newTotal += newPrice;
                        } else {
                            newTotal += pkg.price;
                        }
                    });
                    
                    // Update jengibre packages
                    Object.values(currentJengibreGroups).forEach(group => {
                        const priceInput = document.getElementById(`price-edit-jengibre-${group.packageId}`);
                        if (priceInput) {
                            const newPrice = parseFloat(priceInput.value) || 0;
                            // Update all packages with this packageId proportionally
                            if (group.originalIndices && group.originalIndices.length > 0) {
                                const pricePerPackage = newPrice / group.originalIndices.length;
                                group.originalIndices.forEach(idx => {
                                    if (state.selectedPackages[idx]) {
                                        state.selectedPackages[idx].price = pricePerPackage;
                                    }
                                });
                            }
                            newTotal += newPrice;
                        } else {
                            newTotal += group.price;
                        }
                    });
                    
                    // Disable editing mode and recalculate
                    priceEditingMode = false;
                    // Recalculate total and update display
                    const finalTotal = state.selectedPackages.reduce((sum, pkg) => sum + pkg.price, 0);
                    updateOrderSummary();
                    // Update total display immediately
                    setTimeout(() => {
                        const totalEl = document.getElementById('orderTotalPrice');
                        if (totalEl) {
                            totalEl.textContent = `${finalTotal} Bs.`;
                        }
                    }, 100);
                });
            }
        }
    }

    // Make updateOrderSummary available globally for showStep
    window.updateOrderSummaryStep4 = updateOrderSummary;
    
    // Make remove functions available globally
    window.removePackageFromOrder = function(packageIndex) {
        removePackage(packageIndex);
    };
    
    window.removeJengibrePackageFromOrder = function(packageId) {
        // Remove all packages with this packageId
        const indicesToRemove = [];
        state.selectedPackages.forEach((pkg, idx) => {
            if (pkg.packageId === packageId) {
                indicesToRemove.push(idx);
            }
        });
        // Remove from end to start to maintain correct indices
        indicesToRemove.reverse().forEach(idx => {
            state.selectedPackages.splice(idx, 1);
        });
        // Update jengibrePackages state
        if (state.jengibrePackages[packageId]) {
            delete state.jengibrePackages[packageId];
        }
        
        // If no packages left, go back to step 1 and reset everything
        if (state.selectedPackages.length === 0) {
            state.selectionMode = null;
            state.selectedDesigns = {};
            state.jengibrePackages = {};
            showStep(1);
            // Reset UI after a short delay to ensure DOM is ready
            setTimeout(() => {
                if (typeof window.resetStep1UI === 'function') {
                    window.resetStep1UI();
                }
            }, 100);
            return;
        }
        
        updateOrderSummary();
    };

    btnBack4.addEventListener('click', () => {
        console.log('btnBack4 clicked. Current state:', {
            selectionMode: state.selectionMode,
            selectionModeByPackage: state.selectionModeByPackage,
            currentPackageDesignSelection: state.currentPackageDesignSelection,
            packageDesignSelectionQueue: state.packageDesignSelectionQueue
        });
        
        // If only jengibre packages, go back to step 1
        if (hasOnlyJengibrePackages()) {
            console.log('Only jengibre packages, going back to step 1');
            state.currentPackageDesignSelection = null;
            showStep(1);
            return;
        }
        
        // If no regular packages, go back to step 1
        if (!hasRegularPackages()) {
            console.log('No regular packages, going back to step 1');
            state.currentPackageDesignSelection = null;
            showStep(1);
            return;
        }
        
        // Determine if we're in single or multiple package mode
        const uniqueTypes = getUniqueRegularPackageTypes();
        const isMultiplePackages = uniqueTypes.length > 1;
        
        if (!isMultiplePackages) {
            // Single package mode
            console.log('Single package mode, going back based on selectionMode:', state.selectionMode);
            if (state.selectionMode === 'especifico') {
                // Go back to design selection
                initializePackageDesignQueue();
                if (state.packageDesignSelectionQueue.length > 0) {
                    state.currentPackageDesignSelection = state.packageDesignSelectionQueue[0];
                    showStep(3);
                } else {
                    state.currentPackageDesignSelection = null;
                    showStep(2);
                }
            } else if (state.selectionMode === 'surtido') {
                // Surtido mode, go back to mode selection
                state.currentPackageDesignSelection = null;
                showStep(2);
            } else {
                // No mode selected, go back to step 1
                state.currentPackageDesignSelection = null;
                showStep(1);
            }
        } else {
            // Multiple packages mode
            console.log('Multiple packages mode, uniqueTypes:', uniqueTypes);
            
            // Check if all packages have been configured
            const allConfigured = uniqueTypes.every(packageId => {
                const mode = state.selectionModeByPackage[packageId];
                return mode !== null && mode !== undefined;
            });
            
            if (allConfigured) {
                // All packages configured, go back to last package's design selection or mode selection
                const lastPackageId = uniqueTypes[uniqueTypes.length - 1];
                const lastPackageMode = state.selectionModeByPackage[lastPackageId];
                
                console.log('All packages configured, last package:', lastPackageId, 'mode:', lastPackageMode);
                
                if (lastPackageMode === 'especifico') {
                    // Check if designs are selected for this package
                    const designsForPackage = state.selectedDesignsByPackage[lastPackageId] || {};
                    const hasDesigns = Object.keys(designsForPackage).length > 0;
                    
                    if (hasDesigns) {
                        // Go back to last package's design selection
                        state.currentPackageDesignSelection = lastPackageId;
                        showStep(3);
                    } else {
                        // No designs selected yet, go back to mode selection
                        state.currentPackageDesignSelection = lastPackageId;
                        showStep(2);
                    }
                } else {
                    // Surtido mode, go back to mode selection
                    state.currentPackageDesignSelection = lastPackageId;
                    showStep(2);
                }
            } else {
                // Not all packages configured, go to first unconfigured package
                const firstUnconfigured = uniqueTypes.find(packageId => {
                    const mode = state.selectionModeByPackage[packageId];
                    return mode === null || mode === undefined;
                });
                
                console.log('Not all packages configured, first unconfigured:', firstUnconfigured);
                
                if (firstUnconfigured) {
                    state.currentPackageDesignSelection = firstUnconfigured;
                    showStep(2);
                } else {
                    // Fallback: go to first package's mode selection
                    if (uniqueTypes.length > 0) {
                        state.currentPackageDesignSelection = uniqueTypes[0];
                        showStep(2);
                    } else {
                        showStep(1);
                    }
                }
            }
        }
    });

    // Función para aplicar cambios del modo personal en el paso 4 (disponible globalmente)
    window.applyPersonalModeStep4 = function() {
        // Ocultar campos que no se necesitan en modo personal
        const phoneField = document.getElementById('phone');
        const phoneLabel = phoneField ? phoneField.closest('.form-group') : null;
        if (phoneField) {
            phoneField.removeAttribute('required'); // Remover required para evitar error de validación
            phoneField.value = 'PRIVADO'; // Establecer valor por defecto para pedidos personales
        }
        if (phoneLabel) phoneLabel.style.display = 'none';
        
        const observationsField = document.getElementById('observations');
        const observationsLabel = observationsField ? observationsField.closest('.form-group') : null;
        if (observationsField) {
            observationsField.removeAttribute('required'); // Por si acaso tiene required
        }
        if (observationsLabel) observationsLabel.style.display = 'none';
        
        // Mostrar campos de fecha y hora para modo privado
        console.log('🔍 Buscando campos de fecha y hora...');
        
        // Primero verificar que el step 4 esté activo y visible
        const step4Element = document.getElementById('step4');
        console.log('Step 4 encontrado:', !!step4Element);
        if (step4Element) {
            console.log('Step 4 tiene clase active:', step4Element.classList.contains('active'));
            console.log('Step 4 display:', window.getComputedStyle(step4Element).display);
        }
        
        // Buscar los elementos dentro del step 4 (más específico)
        let deliveryDateGroup = null;
        let deliveryTimeGroup = null;
        
        if (step4Element) {
            deliveryDateGroup = step4Element.querySelector('#deliveryDateGroup');
            deliveryTimeGroup = step4Element.querySelector('#deliveryTimeGroup');
        }
        
        // Si no se encuentran dentro del step 4, intentar buscar globalmente
        if (!deliveryDateGroup) {
            deliveryDateGroup = document.getElementById('deliveryDateGroup');
        }
        if (!deliveryTimeGroup) {
            deliveryTimeGroup = document.getElementById('deliveryTimeGroup');
        }
        
        const deliveryDateInput = document.getElementById('deliveryDate');
        const deliveryTimeInput = document.getElementById('deliveryTime');
        
        console.log('deliveryDateGroup encontrado:', !!deliveryDateGroup);
        console.log('deliveryTimeGroup encontrado:', !!deliveryTimeGroup);
        
        if (deliveryDateGroup) {
            console.log('✅ Mostrando deliveryDateGroup');
            // NO remover el atributo style, solo agregar/actualizar los estilos necesarios
            deliveryDateGroup.classList.add('show');
            // Forzar visibilidad con múltiples métodos - NO remover style, solo actualizar
            deliveryDateGroup.style.setProperty('display', 'block', 'important');
            deliveryDateGroup.style.setProperty('visibility', 'visible', 'important');
            deliveryDateGroup.style.setProperty('opacity', '1', 'important');
            deliveryDateGroup.style.setProperty('height', 'auto', 'important');
            deliveryDateGroup.style.setProperty('min-height', 'auto', 'important');
            console.log('deliveryDateGroup display:', window.getComputedStyle(deliveryDateGroup).display);
            console.log('deliveryDateGroup visibility:', window.getComputedStyle(deliveryDateGroup).visibility);
        } else {
            console.error('❌ deliveryDateGroup NO encontrado en el DOM');
        }
        
        if (deliveryTimeGroup) {
            console.log('✅ Mostrando deliveryTimeGroup');
            // NO remover el atributo style, solo agregar/actualizar los estilos necesarios
            deliveryTimeGroup.classList.add('show');
            // Forzar visibilidad con múltiples métodos - NO remover style, solo actualizar
            deliveryTimeGroup.style.setProperty('display', 'block', 'important');
            deliveryTimeGroup.style.setProperty('visibility', 'visible', 'important');
            deliveryTimeGroup.style.setProperty('opacity', '1', 'important');
            deliveryTimeGroup.style.setProperty('height', 'auto', 'important');
            deliveryTimeGroup.style.setProperty('min-height', 'auto', 'important');
            console.log('deliveryTimeGroup display:', window.getComputedStyle(deliveryTimeGroup).display);
            console.log('deliveryTimeGroup visibility:', window.getComputedStyle(deliveryTimeGroup).visibility);
        } else {
            console.error('❌ deliveryTimeGroup NO encontrado en el DOM');
        }
        
        // Configurar datepicker: establecer fecha mínima como hoy
        if (deliveryDateInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const minDate = `${year}-${month}-${day}`;
            deliveryDateInput.setAttribute('min', minDate);
            
            // En mobile, asegurar que el input tenga el tamaño correcto para el picker
            deliveryDateInput.style.fontSize = '1rem';
            deliveryDateInput.style.padding = '0.9rem';
        }
        
        // Configurar timepicker para mobile
        if (deliveryTimeInput) {
            // En mobile, asegurar que el input tenga el tamaño correcto para el picker
            deliveryTimeInput.style.fontSize = '1rem';
            deliveryTimeInput.style.padding = '0.9rem';
        }
        
        // Ocultar sección de QR
        const paymentSection = document.querySelector('.payment-section');
        if (paymentSection) {
            const qrContainer = paymentSection.querySelector('.qr-container');
            const paymentTitle = paymentSection.querySelector('.payment-title');
            const paymentDescription = paymentSection.querySelector('.payment-description');
            if (qrContainer) qrContainer.style.display = 'none';
            if (paymentTitle) paymentTitle.style.display = 'none';
            if (paymentDescription) paymentDescription.style.display = 'none';
        }
        
        // Ocultar sección de punto de entrega
        const deliverySection = document.querySelector('.delivery-section');
        if (deliverySection) {
            deliverySection.style.display = 'none';
        }
        
        // Cambiar texto del botón
        const btnSubmit = document.getElementById('btnSubmit');
        if (btnSubmit) {
            btnSubmit.textContent = '💾 Realizar Pedido';
        }
        
        // Ocultar mensaje de advertencia
        const warningMessage = document.querySelector('.warning-message');
        if (warningMessage) {
            warningMessage.style.display = 'none';
        }
    };
    
    // NO ejecutar applyPersonalModeStep4 aquí porque el step 4 puede no estar visible todavía
    // Se ejecutará cuando showStep(4) sea llamado y el step 4 esté activo
    console.log('ℹ️ initializeStep4 completado. applyPersonalModeStep4 se ejecutará cuando showStep(4) sea llamado');

    // Deshabilitar validación HTML nativa para manejar todo con JavaScript
    if (orderForm) {
        orderForm.setAttribute('novalidate', 'novalidate');
    }
    
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Formulario enviado. Modo personal:', isPersonalMode);
        
        state.customerInfo.fullName = document.getElementById('fullName').value.trim();
        // En modo personal, usar "PRIVADO" como teléfono; en modo público, obtener del campo
        state.customerInfo.phone = isPersonalMode ? 'PRIVADO' : document.getElementById('phone').value.trim();
        state.customerInfo.observations = isPersonalMode ? '' : document.getElementById('observations').value.trim();
        state.customerInfo.depositAmount = parseFloat(document.getElementById('depositAmount').value) || 0;
        // Capturar fecha y hora solo en modo privado
        if (isPersonalMode) {
            state.customerInfo.deliveryDate = document.getElementById('deliveryDate') ? document.getElementById('deliveryDate').value : '';
            state.customerInfo.deliveryTime = document.getElementById('deliveryTime') ? document.getElementById('deliveryTime').value : '';
        } else {
            state.customerInfo.deliveryDate = '';
            state.customerInfo.deliveryTime = '';
        }

        console.log('Datos capturados:', {
            fullName: state.customerInfo.fullName,
            depositAmount: state.customerInfo.depositAmount,
            isPersonalMode: isPersonalMode
        });

        if (isPersonalMode) {
            // Modo personal: validar nombre, monto depositado, fecha y hora
            console.log('Validando modo personal...');
            
            // Validación específica y amigable
            const missingFields = [];
            if (!state.customerInfo.fullName) {
                missingFields.push('Nombre y Apellido');
            }
            if (state.customerInfo.depositAmount === undefined || state.customerInfo.depositAmount === null || state.customerInfo.depositAmount === '' || isNaN(state.customerInfo.depositAmount) || state.customerInfo.depositAmount < 0) {
                missingFields.push('Monto depositado');
            }
            if (!state.customerInfo.deliveryDate) {
                missingFields.push('Fecha de Entrega');
            }
            if (!state.customerInfo.deliveryTime) {
                missingFields.push('Hora de Entrega');
            }
            
            if (missingFields.length > 0) {
                const message = missingFields.length === 1 
                    ? `Por favor, completa el campo: ${missingFields[0]}`
                    : `Por favor, completa los siguientes campos:\n\n• ${missingFields.join('\n• ')}`;
                showDialog('⚠️ Campos incompletos', message);
                return;
            }
            
            console.log('Datos válidos, enviando pedido personal...');
            showProgressDialog('Guardando tu pedido en Google Sheets...');
            sendPersonalOrder();
        } else {
            // Modo público: validar todos los campos y enviar a WhatsApp
            const missingFields = [];
            if (!state.customerInfo.fullName) {
                missingFields.push('Nombre y Apellido');
            }
            if (!state.customerInfo.phone) {
                missingFields.push('Número de Teléfono');
            }
            if (state.customerInfo.depositAmount === undefined || state.customerInfo.depositAmount === null || state.customerInfo.depositAmount === '' || isNaN(state.customerInfo.depositAmount) || state.customerInfo.depositAmount < 0) {
                missingFields.push('Monto depositado');
            }
            
            if (missingFields.length > 0) {
                const message = missingFields.length === 1 
                    ? `Por favor, completa el campo: ${missingFields[0]}`
                    : `Por favor, completa los siguientes campos:\n\n• ${missingFields.join('\n• ')}`;
                showDialog('⚠️ Campos incompletos', message);
                return;
            }
            
            showProgressDialog('Guardando tu pedido y preparando WhatsApp...');
            sendToWhatsApp();
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
            if (pkg.packageCount && pkg.packageCount > 1) {
                message += `   - Cantidad de paquetes: *${pkg.packageCount}*\n`;
            }
            message += `   - Cantidad: *${pkg.quantity} chocobombas*\n`;
            if (pkg.isCustom && pkg.unitPrice) {
                message += `   - Precio unitario acordado: *${pkg.unitPrice} Bs.*\n`;
            }
            if (pkg.bonus) {
                message += `   - Regalo: *${pkg.bonus}*\n`;
            }
            message += `   - Precio: *${pkg.price} Bs.*\n\n`;
        });
        
        // Designs for regular packages (grouped by package type)
        const uniqueTypes = getUniqueRegularPackageTypes();
        if (uniqueTypes.length === 1) {
            // Single package type: use global selectionMode
            if (state.selectionMode === 'especifico') {
                const packageId = uniqueTypes[0];
                const designsForPackage = state.selectedDesignsByPackage[packageId] || {};
                const surtidoRemaining = state.surtidoRemainingByPackage[packageId] || 0;
                if (Object.keys(designsForPackage).length > 0) {
                    message += `*DISEÑOS SELECCIONADOS:*\n`;
                    Object.entries(designsForPackage).forEach(([designId, quantity]) => {
                        if (quantity > 0) {
                            const design = designs[parseInt(designId)];
                            message += `• ${design.name}: *x${quantity}*\n`;
                        }
                    });
                    message += `\n`;
                }
                if (surtidoRemaining > 0) {
                    message += `*SURTIDOS (diseños variados):* *x${surtidoRemaining}*\n\n`;
                }
            } else if (state.selectionMode === 'surtido') {
                message += `*Tipo:* Surtido (diseños variados)\n\n`;
            }
        } else {
            // Multiple package types: show designs grouped by package
            uniqueTypes.forEach(packageId => {
                const packageMode = state.selectionModeByPackage[packageId];
                const package = state.selectedPackages.find(p => p.packageId === packageId);
                if (package && packageMode) {
                    const packageCount = getPackageCountForType(packageId);
                    if (packageMode === 'especifico') {
                        const designsForPackage = state.selectedDesignsByPackage[packageId] || {};
                        const surtidoRemaining = state.surtidoRemainingByPackage[packageId] || 0;
                        if (Object.keys(designsForPackage).length > 0) {
                            message += `*DISEÑOS PARA ${packageCount > 1 ? packageCount + ' ' : ''}${package.name.toUpperCase()}${packageCount > 1 ? 'S' : ''}:*\n`;
                            Object.entries(designsForPackage).forEach(([designId, quantity]) => {
                                if (quantity > 0) {
                                    const design = designs[parseInt(designId)];
                                    message += `• ${design.name}: *x${quantity}*\n`;
                                }
                            });
                            message += `\n`;
                        }
                        if (surtidoRemaining > 0) {
                            message += `*SURTIDOS PARA ${packageCount > 1 ? packageCount + ' ' : ''}${package.name.toUpperCase()}${packageCount > 1 ? 'S' : ''}:* *x${surtidoRemaining}*\n\n`;
                        }
                    } else if (packageMode === 'surtido') {
                        message += `*${packageCount > 1 ? packageCount + ' ' : ''}${package.name.toUpperCase()}${packageCount > 1 ? 'S' : ''}:* Surtido (diseños variados)\n\n`;
                    }
                }
            });
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
                    unitQuantity: pkg.quantity,
                    packageCount: 0
                };
            }
            jengibreGroups[pkg.packageId].quantity += pkg.quantity;
            jengibreGroups[pkg.packageId].price += pkg.price;
            if (pkg.packageCount) {
                jengibreGroups[pkg.packageId].packageCount += pkg.packageCount;
            } else {
                // For j6, calculate package count from quantity
                if (pkg.packageId === 'j6') {
                    jengibreGroups[pkg.packageId].packageCount += pkg.quantity / 6;
                } else {
                    jengibreGroups[pkg.packageId].packageCount += 1;
                }
            }
        });
        
        // Display grouped packages
        let index = 1;
        Object.values(jengibreGroups).forEach(group => {
            const count = group.packageCount || (group.quantity / group.unitQuantity);
            const countText = count > 1 ? ` (x${count})` : '';
            message += `${index}. *${group.name}${countText}*\n`;
            if (count > 1) {
                message += `   - Cantidad de paquetes: *${count}*\n`;
            }
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

// Function to prepare order data for Google Sheets
function prepareOrderDataForSheets() {
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
    
    // Format regular packages with line breaks (including bonus)
    const regularPackagesText = regularPackages.length > 0
        ? regularPackages.map(pkg => {
            let text = `• ${pkg.name}`;
            if (pkg.packageCount && pkg.packageCount > 1) {
                text += ` (x${pkg.packageCount} paquetes)`;
            }
            text += ` (${pkg.quantity} unidades)`;
            if (pkg.bonus) {
                text += ` - ${pkg.bonus}`;
            }
            if (pkg.isCustom) {
                if (pkg.unitPrice) {
                    text += ` - Precio unitario: ${pkg.unitPrice} Bs.`;
                }
                text += ` - Precio total acordado: ${pkg.price} Bs.`;
            }
            return text;
        }).join('\n')
        : 'Ninguno';
    
    // Calculate total bonus jengibres
    // Note: pkg.bonus already contains the multiplied bonus (e.g., "+ 4 Chocobombas...")
    // So we just need to extract the number from the bonus text, not multiply again
    let totalBonusJengibres = 0;
    regularPackages.forEach(pkg => {
        if (pkg.bonus) {
            const bonusMatch = pkg.bonus.match(/(\d+)/);
            if (bonusMatch) {
                // The bonus text already has the total count (bonus per package × packageCount)
                // So we just extract the number directly
                const bonusCount = parseInt(bonusMatch[1]);
                totalBonusJengibres += bonusCount;
            }
        }
    });
    
    const regularQuantity = regularPackages.reduce((sum, pkg) => sum + pkg.quantity, 0);
    
    // Format designs with line breaks (grouped by package type)
    let designsText = '';
    const uniqueTypes = getUniqueRegularPackageTypes();
    if (uniqueTypes.length === 1) {
        // Single package type: use global selectionMode
        if (state.selectionMode === 'especifico') {
            const packageId = uniqueTypes[0];
            const designsForPackage = state.selectedDesignsByPackage[packageId] || {};
            const surtidoRemaining = state.surtidoRemainingByPackage[packageId] || 0;
            const designList = Object.entries(designsForPackage)
                .filter(([_, qty]) => qty > 0)
                .map(([designId, quantity]) => {
                    const design = designs[parseInt(designId)];
                    return `• ${design.name} x${quantity}`;
                })
                .join('\n');
            if (surtidoRemaining > 0) {
                designsText = designList ? `${designList}\n• Surtido (diseños variados) x${surtidoRemaining}` : `• Surtido (diseños variados) x${surtidoRemaining}`;
            } else {
                designsText = designList || 'N/A';
            }
        } else if (state.selectionMode === 'surtido') {
            designsText = 'Surtido (diseños variados)';
        } else {
            designsText = 'N/A';
        }
    } else {
        // Multiple package types: show designs grouped by package
        const designLists = [];
        uniqueTypes.forEach(packageId => {
            const packageMode = state.selectionModeByPackage[packageId];
            const package = state.selectedPackages.find(p => p.packageId === packageId);
            if (package && packageMode) {
                const packageCount = getPackageCountForType(packageId);
                const packageLabel = `${packageCount > 1 ? packageCount + ' ' : ''}${package.name}${packageCount > 1 ? 's' : ''}`;
                
                if (packageMode === 'especifico') {
                    const designsForPackage = state.selectedDesignsByPackage[packageId] || {};
                    const surtidoRemaining = state.surtidoRemainingByPackage[packageId] || 0;
                    const designList = Object.entries(designsForPackage)
                        .filter(([_, qty]) => qty > 0)
                        .map(([designId, quantity]) => {
                            const design = designs[parseInt(designId)];
                            return `• ${design.name} x${quantity}`;
                        })
                        .join('\n');
                    if (designList || surtidoRemaining > 0) {
                        let packageDesigns = designList || '';
                        if (surtidoRemaining > 0) {
                            packageDesigns += packageDesigns ? `\n• Surtido (diseños variados) x${surtidoRemaining}` : `• Surtido (diseños variados) x${surtidoRemaining}`;
                        }
                        designLists.push(`${packageLabel}:\n${packageDesigns}`);
                    }
                } else if (packageMode === 'surtido') {
                    designLists.push(`${packageLabel}: Surtido (diseños variados)`);
                }
            }
        });
        designsText = designLists.join('\n\n') || 'N/A';
    }
    
    // Format jengibre packages with line breaks
    const jengibrePackagesText = jengibrePackages.length > 0
        ? jengibrePackages.map(pkg => {
            let text = `• ${pkg.name}`;
            if (pkg.packageCount && pkg.packageCount > 1) {
                text += ` (x${pkg.packageCount} paquetes)`;
            }
            text += ` (${pkg.quantity} unidades)`;
            return text;
        }).join('\n')
        : 'Ninguno';
    
    const jengibreQuantity = jengibrePackages.reduce((sum, pkg) => sum + pkg.quantity, 0);
    
    // Calculate remaining amount
    const depositAmount = state.customerInfo.depositAmount || 0;
    const remainingAmount = totalPrice - depositAmount;
    
    // Format bonus jengibres text
    const bonusJengibresText = totalBonusJengibres > 0
        ? `${totalBonusJengibres} Chocobomba${totalBonusJengibres > 1 ? 's' : ''} Jengibre de Regalo 🎁`
        : 'Ninguno';
    
    return {
        fullName: state.customerInfo.fullName,
        phone: state.customerInfo.phone,
        regularPackages: regularPackagesText,
        regularQuantity: regularQuantity,
        designs: designsText,
        jengibrePackages: jengibrePackagesText,
        jengibreQuantity: jengibreQuantity,
        bonusJengibres: bonusJengibresText,
        bonusJengibresQuantity: totalBonusJengibres,
        depositAmount: depositAmount,
        remainingAmount: remainingAmount,
        totalPrice: totalPrice,
        observations: state.customerInfo.observations || '',
        deliveryDate: state.customerInfo.deliveryDate || '',
        deliveryTime: state.customerInfo.deliveryTime || ''
    };
}

// Function to send order to Google Sheets
async function sendOrderToGoogleSheets() {
    // If URL is not configured, skip
    if (!GOOGLE_SHEETS_WEB_APP_URL || GOOGLE_SHEETS_WEB_APP_URL.trim() === '') {
        console.log('Google Sheets URL no configurada, omitiendo registro');
        return;
    }
    
    try {
        const orderData = prepareOrderDataForSheets();
        console.log('Enviando datos a Google Sheets:', orderData);
        
        // Intentar primero sin no-cors para poder ver errores
        try {
            const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Respuesta de Google Sheets:', result);
                if (result.success) {
                    console.log('✅ Pedido registrado correctamente en Google Sheets');
                } else {
                    console.error('❌ Error en Google Sheets:', result.error);
                }
            } else {
                console.error('❌ Error HTTP:', response.status, response.statusText);
                // Si falla por CORS, intentar con no-cors como fallback
                await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
                console.log('Pedido enviado con modo no-cors (no se puede verificar respuesta)');
                // Cerrar diálogo de progreso cuando se usa no-cors (se asume éxito)
                hideDialog();
            }
        } catch (fetchError) {
            // Si hay error de CORS, intentar con no-cors
            if (fetchError.name === 'TypeError' || fetchError.message.includes('CORS')) {
                console.log('Error CORS detectado, intentando con modo no-cors...');
                await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
                console.log('Pedido enviado con modo no-cors (no se puede verificar respuesta)');
            } else {
                throw fetchError;
            }
        }
    } catch (error) {
        console.error('❌ Error al enviar pedido a Google Sheets:', error);
        // No mostramos error al usuario para no interrumpir el flujo
    }
}

// Función para enviar pedido personal (solo a Google Sheets)
async function sendPersonalOrder() {
    console.log('=== sendPersonalOrder() llamado ===');
    console.log('isPersonalMode:', isPersonalMode);
    console.log('window.location.pathname:', window.location.pathname);
    console.log('window.location.href:', window.location.href);
    
    try {
        // Mostrar indicador de carga en el botón
        const btnSubmit = document.getElementById('btnSubmit');
        const originalText = btnSubmit ? btnSubmit.textContent : '';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = '⏳ Guardando...';
        }
        
        // El diálogo de progreso ya está mostrado desde el submit handler
        
        // Enviar a Google Sheets
        const orderData = prepareOrderDataForSheets();
        console.log('=== Datos preparados para Google Sheets ===');
        console.log('orderData:', JSON.stringify(orderData, null, 2));
        console.log('URL de Google Sheets:', GOOGLE_SHEETS_WEB_APP_URL);
        
        // Validar que tenemos datos antes de enviar
        if (!orderData || !orderData.fullName) {
            throw new Error('No se pudieron preparar los datos del pedido correctamente');
        }
        
        // Intentar primero sin no-cors para poder ver errores
        try {
            const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Respuesta de Google Sheets:', result);
                if (result.success) {
                    // Cerrar diálogo de progreso y mostrar éxito
                    hideDialog();
                    showDialog('✅ Éxito', 'Pedido registrado correctamente en Google Sheets');
                    // Resetear formulario después de 2 segundos
                    setTimeout(() => {
                        hideDialog(); // Cerrar el diálogo de éxito
                        if (btnSubmit) {
                            btnSubmit.disabled = false;
                            btnSubmit.textContent = originalText || '💾 Realizar Pedido';
                        }
                        // Resetear formulario
                        document.getElementById('orderForm').reset();
                        // Resetear estado de la aplicación
                        state.selectedPackages = [];
                        state.selectionMode = null;
                        state.selectedDesigns = {};
                        state.jengibrePackages = {};
                        state.customerInfo = {
                            fullName: '',
                            phone: '',
                            observations: '',
                            depositAmount: 0,
                            deliveryDate: '',
                            deliveryTime: ''
                        };
                        // Volver a la página principal (step 0)
                        showStep(0);
                    }, 2000);
                } else {
                    // Cerrar diálogo de progreso y mostrar error
                    hideDialog();
                    showDialog('❌ Error', 'Error al registrar el pedido: ' + (result.error || 'Error desconocido'));
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = originalText;
                    }
                }
            } else {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }
        } catch (fetchError) {
            // Si hay error de CORS, intentar con no-cors
            if (fetchError.name === 'TypeError' || fetchError.message.includes('CORS')) {
                console.log('Error CORS detectado, intentando con modo no-cors...');
                await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
                // Con no-cors no podemos verificar, asumimos éxito
                // Cerrar diálogo de progreso y mostrar éxito
                hideDialog();
                showDialog('✅ Éxito', 'Pedido registrado correctamente en Google Sheets');
                setTimeout(() => {
                    hideDialog(); // Cerrar el diálogo de éxito
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = originalText || '💾 Realizar Pedido';
                    }
                    // Resetear formulario
                    document.getElementById('orderForm').reset();
                    // Resetear estado de la aplicación
                    state.selectedPackages = [];
                    state.selectionMode = null;
                    state.selectedDesigns = {};
                    state.jengibrePackages = {};
                    state.customerInfo = {
                        fullName: '',
                        phone: '',
                        observations: '',
                        depositAmount: 0
                    };
                    // Volver a la página principal (step 0)
                    showStep(0);
                }, 2000);
            } else {
                console.error('Error no manejado:', fetchError);
                throw fetchError;
            }
        }
    } catch (error) {
        console.error('❌ Error al enviar pedido personal:', error);
        console.error('Detalles del error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        // Cerrar diálogo de progreso y mostrar error
        hideDialog();
        showDialog('❌ Error', 'Error al registrar el pedido: ' + (error.message || 'Error desconocido. Por favor, intenta nuevamente.'));
        const btnSubmit = document.getElementById('btnSubmit');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = '💾 Realizar Pedido';
        }
    }
}

async function sendToWhatsApp() {
    try {
        const message = generateWhatsAppMessage();
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
        
        // Send to Google Sheets before opening WhatsApp
        await sendOrderToGoogleSheets();
        
        // Cerrar diálogo de progreso
        hideDialog();
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        
        // Resetear el estado y volver al inicio después de un breve delay
        setTimeout(() => {
            // Resetear formulario
            const orderForm = document.getElementById('orderForm');
            if (orderForm) {
                orderForm.reset();
            }
            
            // Resetear estado de la aplicación
            state.selectedPackages = [];
            state.selectionMode = null;
            state.selectedDesigns = {};
            state.jengibrePackages = {};
            state.customerInfo = {
                fullName: '',
                phone: '',
                observations: '',
                depositAmount: 0
            };
            
            // Volver a la página principal (step 0)
            showStep(0);
        }, 500); // Pequeño delay para asegurar que WhatsApp se abra primero
    } catch (error) {
        // Cerrar diálogo de progreso en caso de error
        hideDialog();
        showDialog('❌ Error', 'Hubo un problema al procesar tu pedido. Por favor, intenta nuevamente.');
        console.error('Error en sendToWhatsApp:', error);
    }
}

// Initialize Welcome Screen
function initializeWelcome() {
    // Si estamos en modo personal, modificar la página de bienvenida
    if (isPersonalMode) {
        const welcomeSubtitle = document.querySelector('#step0 .welcome-subtitle');
        const welcomeFeatures = document.querySelector('#step0 .welcome-features');
        
        // Cambiar el subtítulo a "Pedidos personales"
        if (welcomeSubtitle) {
            welcomeSubtitle.textContent = 'Pedidos personales';
        }
        
        // Ocultar los cards de características
        if (welcomeFeatures) {
            welcomeFeatures.style.display = 'none';
        }
    }
    
    const btnStart = document.getElementById('btnStart');
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            showStep(1);
        });
    }
}

// Handle browser back/forward buttons to prevent ERR_FILE_NOT_FOUND
function handleBrowserNavigation() {
    // Initialize history state on first load using replaceState to avoid adding to history
    if (window.history && window.history.replaceState) {
        try {
            window.history.replaceState({ step: 0 }, '', window.location.href);
        } catch (e) {
            console.log('History API not available');
        }
    }
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(event) {
        // If there's a step in the state, show it
        if (event.state && event.state.step !== undefined) {
            showStep(event.state.step);
        } else {
            // If no state (user trying to go back beyond app), prevent navigation
            // Use replaceState to avoid adding to history stack
            if (window.history && window.history.replaceState) {
                try {
                    window.history.replaceState({ step: state.currentStep }, '', window.location.href);
                } catch (e) {
                    console.log('History API not available');
                }
            }
            // Stay on current step
            showStep(state.currentStep);
        }
    });
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
    handleBrowserNavigation(); // Handle browser navigation
    updateProgressBar();
    // Ensure we start at step 0 (welcome screen)
    showStep(0);
    console.log('=== ALL STEPS INITIALIZED ===');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}

// scripts/main.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the header modals and event listeners
    initializeHeader();
});

function initializeHeader() {
    const infoButton = document.getElementById('infoButton');
    //const settingsButton = document.getElementById('settingsButton');
    const infoModal = document.getElementById('infoModal');
    //const settingsModal = document.getElementById('settingsModal');

    // Function to open a modal
    function openModal(modal) {
        modal.removeAttribute('hidden');
        modal.setAttribute('open', '');
        modal.focus();
        // Trap focus within the modal
        trapFocus(modal);
    }

    // Function to close a modal
    function closeModal(modal) {
        modal.setAttribute('hidden', '');
        modal.removeAttribute('open');
        // Remove event listeners when modal is closed
        document.removeEventListener('keydown', modal.keydownHandler);
    }

    // Function to trap focus within the modal
    function trapFocus(modal) {
        const focusableElements = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        modal.keydownHandler = function(event) {
            const isTabPressed = (event.key === 'Tab' || event.keyCode === 9);

            if (!isTabPressed) return;

            if (event.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }

            // Close modal on Escape key
            if (event.key === 'Escape' || event.keyCode === 27) {
                closeModal(modal);
            }
        };

        document.addEventListener('keydown', modal.keydownHandler);
    }

    // Event listeners for opening modals
    infoButton.addEventListener('click', function() {
        openModal(infoModal);
    });

   /* settingsButton.addEventListener('click', function() {
        openModal(settingsModal);
    });*/

    // Event listeners for closing modals
    document.querySelectorAll('.close-button').forEach(function(button) {
        button.addEventListener('click', function(event) {
            const modalId = event.target.getAttribute('data-close');
            const modal = document.getElementById(modalId);
            closeModal(modal);
        });
    });

    // Close modal when clicking outside the modal content
    document.querySelectorAll('.modal').forEach(function(modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });
}

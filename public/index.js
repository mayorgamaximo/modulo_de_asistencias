const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content');
const statusButtons = document.querySelectorAll('.status-btn');
const dateInput = document.getElementById('fecha');
const dateIcon = document.querySelector('.date-icon');


function getTodayDateFormatted() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}


if (dateIcon) {
    dateIcon.addEventListener('click', () => {
        dateInput.focus();
    });
}


navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');


        const target = btn.getAttribute('data-section');
        sections.forEach(sec => sec.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
       
        if (target === 'asistencia') {
            const firstStudentPresentBtn = document.querySelector('.student-item:first-child .present-status');
            const allFirstStudentBtns = document.querySelectorAll('.student-item:first-child .status-btn');
            let isAnySelected = false;
            allFirstStudentBtns.forEach(b => {
                if(b.classList.contains('active-status')) isAnySelected = true;
            });


            if (firstStudentPresentBtn && !isAnySelected) {
                firstStudentPresentBtn.classList.add('active-status');
            }
        }
    });
});


statusButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const actionsContainer = e.currentTarget.closest('.attendance-actions');
       
        if (actionsContainer) {
            const siblingButtons = actionsContainer.querySelectorAll('.status-btn');
           
            siblingButtons.forEach(btn => {
                btn.classList.remove('active-status');
            });
           
            e.currentTarget.classList.add('active-status');
        }
    });
});


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('asistencia').classList.remove('hidden');


    document.querySelector('[data-section="dashboard"]').classList.remove('active');
    document.querySelector('[data-section="asistencia"]').classList.add('active');


    if (dateInput) {
        dateInput.value = getTodayDateFormatted();
    }


    const firstStudentPresentBtn = document.querySelector('.student-item:first-child .present-status');
    if (firstStudentPresentBtn) {
        firstStudentPresentBtn.classList.add('active-status');
    }
});

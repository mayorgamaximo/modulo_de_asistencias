const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content');
const dateInput = document.getElementById('fecha');
const dateIcon = document.querySelector('.date-icon');
// student list is handled by the tomar_asistencia module


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


// loadStudents is handled inside `modulos/tomar_asistencia.js`


navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');


        const target = btn.getAttribute('data-section');
        sections.forEach(sec => sec.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
       
        // nothing special here; the course module will dispatch `cursoChanged` events
    });
});

// El módulo `modulos/tomar_asistencia.js` se encarga ahora de cargar y mostrar alumnos


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('asistencia').classList.remove('hidden');


    document.querySelector('[data-section="dashboard"]').classList.remove('active');
    document.querySelector('[data-section="asistencia"]').classList.add('active');


    if (dateInput) {
        // if input is native date, set ISO value yyyy-mm-dd so calendar shows today
        if (dateInput.type === 'date') {
            dateInput.value = new Date().toISOString().slice(0, 10);
        } else {
            dateInput.value = getTodayDateFormatted();
        }
    }

    // initial load will be triggered by the course module via `cursoChanged`
});

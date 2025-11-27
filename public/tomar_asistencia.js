// Módulo para poblar selects de Curso (Año) y División desde la API
(function () {
	const anioSelect = document.getElementById('curso-anio');
	const divisionSelect = document.getElementById('curso-division');

	if (!anioSelect || !divisionSelect) return;

	// Build module API helper so that requests always include /modulos/<slug>/ prefix resolved from current path
	const slug = (window.location.pathname || '').split('/').filter(Boolean)[1] || '';
	const moduleBase = slug ? `/modulos/${slug}` : '';
	function moduleApi(p) {
		const normalized = p.startsWith('/') ? p.slice(1) : p;
		return `${moduleBase}/${normalized}`;
	}

	async function fetchCursos() {
		try {
			const res = await fetch(moduleApi('api/cursos'));
			if (!res.ok) throw new Error('Error fetching cursos');
			return await res.json();
		} catch (err) {
			console.error(err);
			return [];
		}
	}

	function uniqueValues(items, key) {
		const set = new Set();
		items.forEach(i => set.add(String(i[key])));
		return Array.from(set);
	}

	function fillSelect(selectEl, values, placeholder) {
		selectEl.innerHTML = '';
		const emptyOpt = document.createElement('option');
		emptyOpt.value = '';
		emptyOpt.textContent = placeholder || 'Seleccionar';
		selectEl.appendChild(emptyOpt);
		values.forEach(v => {
			const opt = document.createElement('option');
			opt.value = v;
			opt.textContent = v;
			selectEl.appendChild(opt);
		});
	}

	function findCursoId(cursos, anio, division) {
		return (cursos.find(c => String(c.anio) === String(anio) && String(c.division) === String(division)) || {}).id;
	}

	function dispatchCursoChanged(id_curso) {
		const ev = new CustomEvent('cursoChanged', { detail: { id_curso } });
		document.dispatchEvent(ev);
	}

	// ---- Lógica para cargar y mostrar alumnos del curso ----
	const studentListContainer = document.querySelector('.student-list');

	// Botón para marcar todos como presentes (ahora está en el HTML)
	const marcarTodosBtn = document.getElementById('marcar-todos-presentes');

	function createStatusHandlers(container) {
		const statusButtons = container.querySelectorAll('.status-btn');
		statusButtons.forEach(button => {
			button.addEventListener('click', (e) => {
				const actionsContainer = e.currentTarget.closest('.attendance-actions');
				if (actionsContainer) {
					const siblingButtons = actionsContainer.querySelectorAll('.status-btn');
					siblingButtons.forEach(btn => btn.classList.remove('active-status'));
					e.currentTarget.classList.add('active-status');
				}
			});
		});
	}

	async function loadStudents(id_curso) {
		if (!id_curso) return;
		if (!studentListContainer) return;
		try {
			const res = await fetch(moduleApi(`api/lista?id_curso=${encodeURIComponent(id_curso)}`));
			if (!res.ok) throw new Error('Error fetching students');
			const students = await res.json();

			// Render students
			studentListContainer.innerHTML = '';
			if (!students || students.length === 0) {
				studentListContainer.innerHTML = '<div class="empty">No hay alumnos en este curso.</div>';
				return;
			}

			students.forEach(s => {
				const div = document.createElement('div');
				div.className = 'student-item';
				const nameSpan = document.createElement('span');
				// support both naming conventions: `nombres`/`apellidos` (DB) or `nombre`/`apellido`
				const last = s.apellidos ?? s.apellido ?? '';
				const first = s.nombres ?? s.nombre ?? '';
				nameSpan.textContent = `${last}, ${first}`.trim().replace(/^,|,$/g, '');
				if (s.id_alumno) div.dataset.idAlumno = s.id_alumno;
				const actions = document.createElement('div');
				actions.className = 'attendance-actions';

				actions.innerHTML = `
					<button class="status-btn present-status"><span class="status-letra">P</span><i class="fa-solid fa-check"></i></button>
					<button class="status-btn late-status"><span class="status-letra">T</span><i class="fa-solid fa-clock"></i></button>
					<button class="status-btn absent-status"><span class="status-letra">A</span><i class="fa-solid fa-xmark"></i></button>
				`;

				div.appendChild(nameSpan);
				div.appendChild(actions);
				studentListContainer.appendChild(div);
			});

			// Attach handlers
			createStatusHandlers(studentListContainer);

			// Ya no marcar ninguno como presente por defecto

			// Re-attach marcar todos handler (in case of reload)
			if (marcarTodosBtn) {
				marcarTodosBtn.onclick = function () {
					const items = studentListContainer.querySelectorAll('.student-item');
					items.forEach(item => {
						const presentBtn = item.querySelector('.present-status');
						if (presentBtn) {
							// Remove active from all
							const btns = item.querySelectorAll('.status-btn');
							btns.forEach(btn => btn.classList.remove('active-status'));
							presentBtn.classList.add('active-status');
						}
					});
				};
			}

		} catch (err) {
			console.error(err);
			studentListContainer.innerHTML = '<div class="empty">Error al cargar alumnos.</div>';
		}
	}

	// Escuchar cambios de curso despachados por este módulo (o por otros) y cargar alumnos
	document.addEventListener('cursoChanged', (e) => {
		const id = e?.detail?.id_curso;
		if (id) loadStudents(id);
	});

	// --- Envío de asistencias ---
		const enviarBtn = document.getElementById('enviar-asistencias');
		const turnoSelect = document.getElementById('turno');

	function parseDateInput(value) {
		// acepta dd/mm/yyyy o yyyy-mm-dd
		if (!value) return null;
		if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
			const [d, m, y] = value.split('/');
			return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
		}
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
		return null;
	}

	async function enviarAsistencias() {
		if (!studentListContainer) return alert('No hay lista de alumnos cargada.');
		const fechaInput = document.getElementById('fecha');
		const fechaRaw = fechaInput ? fechaInput.value : '';
		const fecha = parseDateInput(fechaRaw);
		if (!fecha) return alert('Formato de fecha inválido. Use DD/MM/YYYY o seleccione desde el calendario.');
			if (!turnoSelect || !turnoSelect.value) return alert('Seleccione un turno antes de enviar.');
			const turno = turnoSelect.value;

		const items = Array.from(studentListContainer.querySelectorAll('.student-item'));
		if (items.length === 0) return alert('No hay alumnos para enviar.');

		const entries = items.map(item => {
			const id_alumno = item.dataset.idAlumno ? Number(item.dataset.idAlumno) : null;
			const activeBtn = item.querySelector('.attendance-actions .status-btn.active-status');
			let estado = 'ausente';
			if (activeBtn && activeBtn.classList.contains('present-status')) estado = 'presente';
			if (activeBtn && activeBtn.classList.contains('late-status')) estado = 'tarde';
			return { id_alumno, estado };
		}).filter(e => e.id_alumno);

		if (entries.length === 0) return alert('No se encontraron IDs de alumnos para enviar.');

		try {
			enviarBtn.disabled = true;
			enviarBtn.textContent = 'Enviando...';
			const res = await fetch(moduleApi('api/asistencias'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fecha, entries, turno })
			});
			// Try parsing JSON only if the server returns JSON.
			let data;
			const contentType = res.headers.get('content-type') || '';
			if (contentType.includes('application/json')) {
				try { data = await res.json(); }
				catch (e) { console.error('[CLIENT] Error parsing JSON from response', e); data = null; }
			} else {
				// Not JSON: log the text response for debugging and create a placeholder
				const text = await res.text();
				console.warn('[CLIENT] Non-JSON response from server:', text);
				data = { error: `Server responded with non-JSON (${res.status})` };
			}
			if (!res.ok) throw new Error((data && data.error) || `Error al guardar (HTTP ${res.status})`);
			// dispatch event so historial can refresh
			const cursoId = findCursoId(await fetchCursos(), anioSelect.value, divisionSelect.value);
			const ev = new CustomEvent('asistenciasSaved', { detail: { fecha, cursoId, turno } });
			document.dispatchEvent(ev);
			alert('Asistencias guardadas correctamente.');
		} catch (err) {
			console.error(err);
			alert('Error al guardar asistencias. Revisa la consola.');
		} finally {
			enviarBtn.disabled = false;
			enviarBtn.textContent = 'Enviar Asistencias';
		}
	}

	if (enviarBtn) {
		enviarBtn.addEventListener('click', (e) => { e.preventDefault(); enviarAsistencias(); });
	}

	// Inicialización
	(async function init() {
		const cursos = await fetchCursos();

		if (!cursos || cursos.length === 0) {
			fillSelect(anioSelect, [], 'No hay cursos');
			fillSelect(divisionSelect, [], 'No hay divisiones');
			return;
		}

		// Poblar años y divisiones únicos
		const anios = uniqueValues(cursos, 'anio');
		const divisiones = uniqueValues(cursos, 'division');

		fillSelect(anioSelect, anios, 'Seleccione año');
		fillSelect(divisionSelect, divisiones, 'Seleccione división');

		// No seleccionar automáticamente: dejar los selects en el placeholder
		// Despachar `cursoChanged` sólo cuando el usuario elige tanto año como división
		anioSelect.addEventListener('change', () => {
			const anio = anioSelect.value;
			const division = divisionSelect.value;
			if (!anio || !division) return;
			const id = findCursoId(cursos, anio, division);
			if (id) dispatchCursoChanged(id);
		});

		divisionSelect.addEventListener('change', () => {
			const anio = anioSelect.value;
			const division = divisionSelect.value;
			if (!anio || !division) return;
			const id = findCursoId(cursos, anio, division);
			if (id) dispatchCursoChanged(id);
		});
	})();
})();

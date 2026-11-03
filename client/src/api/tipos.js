/**
  * Tipos de las respuestas y cargas de la API.
  * `[campo]` = opcional; `|null` = puede llegar vacío.
 */


/** @typedef {'ESTUDIANTE'|'PROFESOR'|'ADMINISTRATIVO'} Estamento */
/** @typedef {'SOLICITANTE'|'APROBADOR'|'ADMINISTRADOR'} RolSistema */
/** @typedef {'PENDIENTE'|'APROBADO'|'RECHAZADO'} EstadoSolicitud */
/** @typedef {'PENDIENTE'|'APROBADO'|'RECHAZADO'} EstadoAprobacion */
/** @typedef {'BORRADOR'|'ACTIVO'|'INACTIVO'} EstadoVersion */
/** @typedef {'BORRADOR'|'ACTIVO'} EstadoFlujo - Un flujo ACTIVO nunca cambia de estructura */
/** @typedef {'text'|'number'|'date'|'textarea'|'select'|'checkbox'} TipoCampo */


/**
  * Cuerpo de los errores. http.js lo convierte en un `Error` con `message`, `codigo`, `detalles` y `status`.
 * @typedef {Object} ErrorApi
 * @property {{ codigo: string, mensaje: string, detalles?: Array<{ campo: string, mensaje: string }> }} error
 */

/**
  * Respuesta paginada.
 * @template T
 * @typedef {Object} Pagina
 * @property {number} total
 * @property {number} pagina
 * @property {number} limite
 * @property {number} totalPaginas
 * @property {T[]} datos
 */


/**
 * @typedef {Object} UnidadResumen
 * @property {number} codUnidad
 * @property {string} nombre 
 * @property {string|null} tipoUnidad 
 * @property {string|null} abrev
 */

/**
 * @typedef {Object} CargoResumen
 * @property {number} idAsignacion
 * @property {number} idCargo
 * @property {string} nombreCargo
 * @property {string} titularActual - Persona que ocupa la asignación
  * @property {number|null} idUsuarioTitular - Usuario del titular; null si no tiene cuenta
 * @property {string} area - «Área General» si la asignación no define una
  * @property {string|null} [escuela] - Solo en cargos de escuela
  * @property {string|null} [departamento] - Solo en cargos de departamento
  * @property {boolean} esAprobador - El titular tiene cuenta activa y rol APROBADOR
 */

/**
 * @typedef {Object} PasoFlujo
 * @property {number} secuencia - Desde 1
  * @property {'FIJO'|'ESCUELA_SOLICITANTE'} [alcance='FIJO'] - ESCUELA_SOLICITANTE: titular del cargo en la escuela del solicitante
 *   de la carrera del solicitante (se resuelve al radicar)
 * @property {number|null} [idAsignacion] - Obligatorio con FIJO; null con ESCUELA_SOLICITANTE sin resolver
 * @property {number} [idCargo] - Obligatorio con ESCUELA_SOLICITANTE
 * @property {string} [nombreCargo] - Solo en respuestas
 * @property {string|null} [titular] - Solo en respuestas
 * @property {string|null} [area] - Solo en respuestas
 * @property {boolean} [reqFirma=true]
 */


/** @typedef {{ valor: string, etiqueta: string }} OpcionSelector */

/**
 * @typedef {Object} ValidacionCampo
 * @property {number} [min] - Caracteres (text, textarea) o valor (number)
 * @property {number} [max]
 * @property {string} [patron] - Regex para text
 * @property {boolean} [decimales=false] - number
 * @property {'libre'|'pasadas'|'futuras'} [reglaTemporal='libre'] - date
 * @property {boolean} [soloDiasHabiles=false] - date
 */

/**
 * @typedef {Object} VariableFormulario
 * @property {string} id - ^[a-zA-Z][a-zA-Z0-9_]*$
 * @property {string} etiqueta
 * @property {string} [pregunta] - Texto que ve el solicitante en el formulario
 * @property {TipoCampo} tipo
 * @property {boolean} requerido
 * @property {string} [placeholder]
 * @property {OpcionSelector[]} [opciones] - Obligatorias si tipo = select
 * @property {'lista'|'radio'} [presentacion='lista'] - select
 * @property {boolean} [opcionOtro=false] - select; el texto libre va en datosJson["{id}Otro"]
 * @property {string} [textoLegal] - checkbox
 * @property {ValidacionCampo} [validaciones]
 */

/** @typedef {{ variables: VariableFormulario[] }} VariableFormJson */

/** @typedef {'/logos/escudo_up.png'|'/logos/logo_fiec.png'|null} LogoInstitucional */

/**
 * Tipografía base del documento.
 * @typedef {Object} DisenoFormato
 * @property {'Arial'|'Times New Roman'} [fuente='Arial']
 * @property {'11pt'|'12pt'} [tamano='11pt']
 * @property {'1.0'|'1.15'|'1.5'} [interlineado='1.15']
 */

/**
 * @typedef {Object} DisenoEncabezado
 * @property {boolean} [activo]
 * @property {LogoInstitucional} [logoIzqUrl]
 * @property {LogoInstitucional} [logoDerUrl]
 * @property {string} [linea1]
 * @property {string} [linea2]
 * @property {string|null} [linea3]
 * @property {string|null} [linea4]
 */

/**
 * @typedef {Object} DisenoPiePagina
 * @property {boolean} [activo]
 * @property {{ type: 'doc', content: Object[] }} [contenido] - Texto libre del pie
 * @property {string} [lemaOficial]
 * @property {string} [direccion]
 * @property {string} [telefonos]
 * @property {boolean} [mostrarPaginacion]
 */

/**
 * @typedef {Object} DisenoFormJson
 * @property {DisenoFormato} [formato]
 * @property {DisenoEncabezado} [encabezado]
 * @property {{ type: 'doc', content: Object[] }} cuerpoDocumento - Árbol del editor
 * @property {DisenoPiePagina} [piePagina]
 */


/**
 * Usuario devuelto por POST /auth/login.
 * @typedef {Object} UsuarioLogin
 * @property {number} idUsuario
 * @property {string} correo
 * @property {string} cedula
 * @property {string} nombreCompleto
 * @property {RolSistema[]} roles
 * @property {Estamento[]} estamentos
 * @property {number} [codUnidad]
 * @property {boolean} debeCambiarPassword - true mientras tenga la contraseña inicial
 */

/**
 * Perfil devuelto por GET /auth/me.
 * @typedef {Object} UsuarioPerfil
 * @property {number} idUsuario
 * @property {string} correo
 * @property {string} cedula
 * @property {string} nombre
 * @property {string} apellido
 * @property {string} nombreCompleto
 * @property {string|null} ultimoAcceso - Inicio de sesión anterior; null en el primer acceso
 * @property {RolSistema[]} roles
 * @property {Estamento[]} estamentos
 * @property {UnidadResumen} unidad
 * @property {{ idCarrera: number, descripcion: string, escuela: string|null }|null} [carrera] - `escuela`: la de la carrera
 * @property {CargoResumen[]} [cargos] - Cargos vigentes: el titular es el propio usuario
 * @property {boolean} debeCambiarPassword - true mientras tenga la contraseña inicial
 */


/**
 * Item del inventario (GET /templates).
 * @typedef {Object} PlantillaInventarioItem
 * @property {number} idPlantilla
 * @property {string} nombre
 * @property {string} [descripcion]
 * @property {number} [codUnidad]
 * @property {Estamento[]} audiencia
 * @property {number} numeroVersion - Versión listada; corresponde a estadoVersion
 * @property {EstadoVersion} estadoVersion
 * @property {number|null} [idVersionBorrador] - Versión en BORRADOR, si existe
 * @property {string} fechaActualizacion - Publicación o, en un borrador sin publicar, registro
 */

/**
 * Resumen por estado de la versión vigente (GET /templates/summary).
 * @typedef {Object} ResumenPlantillas
 * @property {number} total - Todas las plantillas de la unidad
 * @property {number} activas
 * @property {number} borradores - Nunca publicadas
 * @property {number} inactivas
 */

/**
 * Item del catálogo del solicitante (GET /templates/catalog).
 * @typedef {Object} PlantillaCatalogoItem
 * @property {number} idPlantilla
 * @property {number} idVersion
 * @property {string} nombre
 * @property {string} descripcion
 * @property {number} codUnidad
 */

/**
 * Plantilla completa (GET /templates/{id}).
 * @typedef {Object} PlantillaCompleta
 * @property {number} idPlantilla
 * @property {string} nombre
 * @property {string} [descripcion]
 * @property {number} codUnidad
 * @property {Estamento[]} audiencia
 * @property {number} idVersion
 * @property {number} numeroVersion
 * @property {EstadoVersion} estado
 * @property {string|null} [fechaPublicacion]
 * @property {{ idVersion: number, numeroVersion: number }|null} [versionBorrador] - Solo administrador
 * @property {VariableFormJson} variableFormJson
 * @property {DisenoFormJson} disenoFormJson
 * @property {VariablesSistema|null} [variablesSistema] - Vista previa de los datos automáticos del solicitante
 * @property {{ idFlujo: number, nombre: string, codigo: string, estado: EstadoFlujo, pasos: PasoFlujo[] }|null} [flujo] -
 *   null solo en borradores sin flujo
 */

/**
 * Respuesta de crear plantilla, crear versión, publicar y desactivar.
 * `EstadoVersion` queda `ACTIVO` al publicar e `INACTIVO` al desactivar.
 * @typedef {Object} PlantillaEscrita
 * @property {number} idPlantilla
 * @property {number} idVersion
 * @property {number} [numeroVersion]
 * @property {EstadoVersion} [estado]
 * @property {string} mensaje
 */

/**
 * @typedef {Object} FlujoResumen
 * @property {number} idFlujo
 * @property {string} nombre
 * @property {string} codigo
 * @property {number} totalPasos
 * @property {string[]} pasosResumen
 */

/**
 * Respuesta de crear (POST) o editar (PUT) un flujo.
 * @typedef {Object} FlujoEscrito
 * @property {number} idFlujo
 * @property {string} codigo
 * @property {EstadoFlujo} estado
 * @property {number} totalPasos
 * @property {string} mensaje
 */

/**
 * @typedef {Object} FlujoDetalle
 * @property {number} idFlujo
 * @property {string} nombre
 * @property {string} codigo
 * @property {EstadoFlujo} estado
 * @property {string|null} [descripcion]
 * @property {number} codUnidad
 * @property {PasoFlujo[]} pasos
 */


/**
 * Item de GET /requests/me.
 * @typedef {Object} SolicitudResumen
 * @property {number} idSolicitud
 * @property {string} codigoDocumento
 * @property {string} nombrePlantilla
 * @property {EstadoSolicitud} estado
 * @property {string} fechaCreacion
 * @property {{ nombreCargo: string, titular: string|null, fecha: string }|null} resolucion - Null si está PENDIENTE
 * @property {string|null} [motivoRechazo] - Solo si está RECHAZADO
 */

/**
 * @typedef {Object} LineaTiempoPaso
 * @property {number} secuencia
 * @property {string} nombreCargo
 * @property {EstadoAprobacion} estado
 * @property {string|null} [titular]
 * @property {string|null} [fechaAccion]
 * @property {string|null} [comentario]
 * @property {string|null} [firmaUrl] - Solo en pasos aprobados
 */

/**
 * Variables automáticas congeladas al radicar; null si no aplican al solicitante.
 * @typedef {Object} VariablesSistema
 * @property {string|null} auth.nombre_completo
 * @property {string|null} auth.cedula
 * @property {string|null} auth.correo
 * @property {string|null} estudiante.carrera
 * @property {string|null} estudiante.escuela
 * @property {string|null} estudiante.facultad
 * @property {string|null} personal.cargo
 * @property {string|null} personal.departamento
 * @property {string|null} sistema.fecha_formal - Fecha de radicación formateada
 * @property {string|null} solicitud.codigo
 */

/**
 * Paso del flujo de la versión, alcanzado o no (ruta y bloque de firmas).
 * @typedef {Object} PasoDocumento
 * @property {number} secuencia
 * @property {string} nombreCargo
 * @property {string|null} [titular]
 * @property {string|null} [area]
 * @property {boolean} reqFirma
 * @property {EstadoAprobacion|null} estado - null si aún no se alcanza
 * @property {string|null} [fechaAccion]
 * @property {string|null} [comentario]
 * @property {string|null} [firmaUrl] - Solo en pasos aprobados con firma
 */

/**
 * Detalle de GET /requests/{id}.
 * @typedef {Object} SolicitudDetalle
 * @property {number} idSolicitud
 * @property {string} codigoDocumento
 * @property {number} idPlantilla
 * @property {string} nombrePlantilla
 * @property {number} idVersion
 * @property {EstadoSolicitud} estado
 * @property {string} fechaCreacion
 * @property {string|null} [fechaResolucion]
 * @property {number|null} [idAprobacionPendiente] - Solo si el paso activo es del usuario en sesión
 * @property {{ idUsuario: number, nombreCompleto: string, cedula: string, correo: string,
 *   carrera?: string|null }} solicitante
 * @property {Object<string, *>} datosJson - Respuestas por id de variable
 * @property {VariablesSistema} variablesSistema
 * @property {VariableFormJson} variableFormJson
 * @property {DisenoFormJson} disenoFormJson
 * @property {PasoDocumento[]} pasosDocumento - Todos los pasos del flujo
 * @property {LineaTiempoPaso[]} lineaTiempo - Solo los pasos ya alcanzados
 */

/**
 * @typedef {Object} SolicitudCreada
 * @property {number} idSolicitud
 * @property {string} codigoDocumento
 * @property {EstadoSolicitud} estado
 * @property {string} fechaCreacion
 * @property {string} mensaje
 */


/**
 * Item de GET /approvals/pending.
 * @typedef {Object} AprobacionPendiente
 * @property {number} idAprobacion
 * @property {number} idSolicitud
 * @property {string} codigoDocumento
 * @property {string} nombrePlantilla
 * @property {string} solicitanteNombre
 * @property {string} solicitanteCedula
 * @property {string} fechaAsignacion
 */

/**
 * Item de GET /approvals/history.
 * @typedef {Object} AprobacionHistorial
 * @property {number} idAprobacion
 * @property {number} idSolicitud
 * @property {string} codigoDocumento
 * @property {string} nombrePlantilla
 * @property {string} solicitanteNombre
 * @property {string} solicitanteCedula
 * @property {EstadoAprobacion} decision
 * @property {string|null} [comentario]
 * @property {string} fechaAccion
 */

/**
 * Respuesta de POST /approvals/{id}/decision.
 * @typedef {Object} DecisionRegistrada
 * @property {number} idAprobacion
 * @property {EstadoAprobacion} estadoAprobacion
 * @property {EstadoSolicitud} estadoSolicitud
 * @property {string} fechaAccion
 * @property {boolean} solicitudFinalizada
 * @property {string} mensaje
 */

export {};

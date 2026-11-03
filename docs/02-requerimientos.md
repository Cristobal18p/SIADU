# 02 — Definición y requerimientos

## 1. Qué es SIADU

SIADU (Sistema Integral de Automatización de Documentos Universitarios) es una plataforma web para la **Universidad de Panamá — Facultad de Informática, Electrónica y Comunicación (FIEC)**.

Centraliza la emisión de documentos administrativos. El administrador diseña cada plantilla en un constructor visual donde lo que ve es el documento oficial que se generará. De esa plantilla sale un formulario con solo los datos que aporta el solicitante. La solicitud recorre un flujo de aprobación secuencial y, al completarse, el sistema genera el PDF oficial con los datos y las firmas.

---

## 2. Roles

| Rol | Qué hace |
|:----|:---------|
| **Administrador** | Crea y edita plantillas, define sus variables y configura los flujos de aprobación de su unidad. |
| **Solicitante** | Elige un trámite, llena el formulario generado y sigue el estado de su solicitud. Lo tiene toda cuenta activa. |
| **Aprobador** | Revisa las solicitudes de su bandeja y las aprueba o rechaza. |

---

## 3. Requerimientos funcionales

| ID | Requerimiento |
|:---|:--------------|
| **RF-01** | Diseño de plantillas con campos variables (texto, número, fecha, selección, casilla) en un editor institucional. |
| **RF-02** | Flujos de aprobación secuenciales por cargos, asociados a cada plantilla. |
| **RF-03** | Formulario web generado a partir de las variables de la plantilla. |
| **RF-04** | Autenticación con JWT y acceso a rutas y operaciones según el rol. |
| **RF-05** | PDF oficial generado en el servidor con Chromium al completarse el flujo. |
| **RF-06** | Estado y paso actual de cada solicitud visibles para el solicitante. |
| **RF-07** | Versiones de plantilla: publicar una nueva no afecta a las solicitudes radicadas con la anterior. |
| **RF-08** | Flujos reutilizables: un flujo puede asignarse a varias plantillas. |

**Firma:** no es firma digital avanzada (PAdES ni certificados). Cada aprobador tiene la imagen de su firma autorizada en Supabase Storage, y al aprobar esa imagen se incorpora al documento.

**Fuera del alcance:** notificaciones por correo, delegación de firmas, aplicación móvil nativa, firma digital avanzada, hash de integridad en el PDF y almacenamiento de los PDF.

---

## 4. Requerimientos no funcionales

| ID | Requerimiento |
|:---|:--------------|
| **RNF-01** | Interfaz responsiva: el solicitante y el aprobador trabajan desde el móvil; el administrador, desde el escritorio. |
| **RNF-02** | El editor, la vista previa y el PDF muestran el mismo documento: mismos estilos, medidas y cortes de página. |
| **RNF-03** | Contraseñas con hash bcrypt y comunicación por HTTPS. |
| **RNF-04** | Tratamiento de datos personales conforme a la Ley 81 de Protección de Datos Personales de Panamá. |

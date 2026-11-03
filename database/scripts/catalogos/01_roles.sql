-- Roles con privilegios. SOLICITANTE no se guarda: lo tiene toda cuenta activa.
INSERT INTO roles (descripcion) VALUES
('Aprobador'),
('Administrador')
ON CONFLICT (descripcion) DO NOTHING;

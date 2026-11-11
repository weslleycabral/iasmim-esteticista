-- Rede de onde veio o acesso (request.cf.asn e asOrganization): separa robôs de datacenter com cara de navegador.
ALTER TABLE acessos ADD COLUMN asn INTEGER NOT NULL DEFAULT 0;
ALTER TABLE acessos ADD COLUMN rede TEXT NOT NULL DEFAULT '';

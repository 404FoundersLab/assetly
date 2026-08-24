ALTER TABLE endpoints
ADD COLUMN firewall_status VARCHAR(255),
ADD COLUMN defender_status VARCHAR(255),
ADD COLUMN antivirus_updated_at VARCHAR(255),
ADD COLUMN active_ports JSONB;

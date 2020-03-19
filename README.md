platform

## 
```
CREATE ROLE gitea WITH LOGIN PASSWORD 'gitea';
CREATE DATABASE gitea WITH OWNER gitea TEMPLATE template0 ENCODING UTF8 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
```
```
CREATE ROLE platform WITH LOGIN PASSWORD 'platform';
CREATE DATABASE platform WITH OWNER platform TEMPLATE template0 ENCODING UTF8 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
```


in gitea
	add system webhook 
		http://mgmt:4467/gitea-hook
		gitea-secret
	add admin user
		machine
		Password123!
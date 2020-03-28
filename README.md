platform
[![Build Status](https://drone.ultima.re/api/badges/joshbalfour/platform/status.svg)](https://drone.ultima.re/joshbalfour/platform)
## 
```
CREATE ROLE gitea WITH LOGIN PASSWORD 'gitea';
CREATE DATABASE gitea WITH OWNER gitea TEMPLATE template0 ENCODING UTF8 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';

CREATE ROLE platform WITH LOGIN PASSWORD 'platform';
CREATE DATABASE platform WITH OWNER platform TEMPLATE template0 ENCODING UTF8 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
```


in gitea
	add default webhook 
		http://mgmt/gitea-hook
		gitea-secret
	add admin user
		machine
		Password123!

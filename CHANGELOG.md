# Changelog

## [1.7.0](https://github.com/caedes/covoiturage-college/compare/v1.6.0...v1.7.0) (2026-11-26)


### Nouveautés

* afficher le type de semaine A/B dans les onglets ([#26](https://github.com/caedes/covoiturage-college/issues/26)) ([6a94784](https://github.com/caedes/covoiturage-college/commit/6a9478452a45a9a577a34ca804d54d9ba474cf7b))

## [1.6.0](https://github.com/caedes/covoiturage-college/compare/v1.5.0...v1.6.0) (2026-11-17)


### Nouveautés

* confirmer avant annuler et je le prends ([01ef255](https://github.com/caedes/covoiturage-college/commit/01ef255c67feb3dd2e2d836a778a8922b5de2152))
* horaires modifiés du jour pour un enfant ([#25](https://github.com/caedes/covoiturage-college/issues/25)) ([88af7e4](https://github.com/caedes/covoiturage-college/commit/88af7e472caafb27db31ad225b6cbc35a4dd2524))
* pop-in de confirmation ConfirmDialog sur l'alert-dialog shadcn ([1ff6c5d](https://github.com/caedes/covoiturage-college/commit/1ff6c5dbd3f605a7e4b3f7b288d8034b5aa392de))
* renoncer par un clic sur le fond grisé de la pop-in ([d09e027](https://github.com/caedes/covoiturage-college/commit/d09e027b555bb13b0cc0e34c8359c976bcf1ba8e))
* textes de confirmation avant annuler et je le prends ([a1dec30](https://github.com/caedes/covoiturage-college/commit/a1dec304b1a597e7cbb44a5cf196c29146662ad9))


### Corrections

* rendre le focus au bouton du trajet après la pop-in, même sur safari ([a52c5fd](https://github.com/caedes/covoiturage-college/commit/a52c5fd426bdc2360354b56e2918b8fbd2f9f73e))

## [1.5.0](https://github.com/caedes/covoiturage-college/compare/v1.4.0...v1.5.0) (2026-11-17)


### Nouveautés

* afficher la version à côté du titre, liée à ses notes de version ([a9f6038](https://github.com/caedes/covoiturage-college/commit/a9f6038b659abe0646e6332cda6001500ffa3448))

## [1.4.0](https://github.com/caedes/covoiturage-college/compare/v1.3.0...v1.4.0) (2026-11-16)


### Nouveautés

* brancher le mode development sur les émulateurs firebase ([#18](https://github.com/caedes/covoiturage-college/pull/18)) ([6fecc3e](https://github.com/caedes/covoiturage-college/commit/6fecc3ef7456c533a8fb721cf11f38e51234b519))
* lancer le serveur de développement sur des émulateurs pré-remplis ([#18](https://github.com/caedes/covoiturage-college/pull/18)) ([8a98eb5](https://github.com/caedes/covoiturage-college/commit/8a98eb5dded4a347e4f88a847c6a0b297565ef14))
* créer dans l'émulateur auth un compte google par membre importé ([#18](https://github.com/caedes/covoiturage-college/pull/18)) ([446caee](https://github.com/caedes/covoiturage-college/commit/446caee20589d421c44ae08ae29018f990eb1b18))


### Corrections

* désigner les vraies sources de surcharge dans le message de la garde ([#18](https://github.com/caedes/covoiturage-college/pull/18)) ([823cd26](https://github.com/caedes/covoiturage-college/commit/823cd26c9a6322626a0abf60e92649ebaf0fff0d))
* arrêter émulateurs et vite quand npm run dev reçoit un signal d'arrêt ([#18](https://github.com/caedes/covoiturage-college/pull/18)) ([dd4e036](https://github.com/caedes/covoiturage-college/commit/dd4e0362a08bc02b2d3e9c10600997c8523ff7cd))
* joindre l'émulateur auth par localhost pour ne pas perdre la connexion dans chrome ([#18](https://github.com/caedes/covoiturage-college/pull/18)) ([8e4bb04](https://github.com/caedes/covoiturage-college/commit/8e4bb04c5eee41528585d4474a1bb7b458893b5d))

## [1.3.0](https://github.com/caedes/covoiturage-college/compare/v1.2.0...v1.3.0) (2026-11-01)


### Nouveautés

* 🎸 ajouter la voiture de noto emoji et générer les icônes ([#17](https://github.com/caedes/covoiturage-college/pull/17)) ([b851de3](https://github.com/caedes/covoiturage-college/commit/b851de3cb415d4b87a09d21707e0dcc550c89a13))
* 🎸 rendre l'application installable avec un manifeste et des icônes ([#17](https://github.com/caedes/covoiturage-college/pull/17)) ([43f48ca](https://github.com/caedes/covoiturage-college/commit/43f48caf40cc99841892686c1cd3906be1bde520))
* 🎸 afficher la voiture en écran de démarrage jusqu'à la fin de la vérification d'accès ([#17](https://github.com/caedes/covoiturage-college/pull/17)) ([c2c6557](https://github.com/caedes/covoiturage-college/commit/c2c6557e2e159e835a1f38a7a46d40de0219470c))
* 🎸 lire le résultat de la connexion au retour de google ([#17](https://github.com/caedes/covoiturage-college/pull/17)) ([ef14cf5](https://github.com/caedes/covoiturage-college/commit/ef14cf5ac07aae316f22cb8d666b2fa5c1b4592e))
* 🎸 se connecter par redirection, relayée par le domaine de l'application ([#17](https://github.com/caedes/covoiturage-college/pull/17)) ([72e3bae](https://github.com/caedes/covoiturage-college/commit/72e3bae1fe092f09287cec8984cbd6ec0202cd8d))


### Corrections

* importer le proxy firebase avec son extension pour le chargeur de config vite ([#17](https://github.com/caedes/covoiturage-college/pull/17)) ([b4f316a](https://github.com/caedes/covoiturage-college/commit/b4f316a2144d48304e0a07021df3d134e6ef8ca0))
* prévoir une largeur de repli pour l'écran de démarrage sans dvh ([#17](https://github.com/caedes/covoiturage-college/pull/17)) ([74a5dfe](https://github.com/caedes/covoiturage-college/commit/74a5dfe950aeecdb4a18774bf94763adecc1824e))

## [1.2.0](https://github.com/caedes/covoiturage-college/compare/v1.1.0...v1.2.0) (2026-10-06)


### Nouveautés

* 🎸 ajouter le menu du compte ([#16](https://github.com/caedes/covoiturage-college/pull/16)) ([731dd27](https://github.com/caedes/covoiturage-college/commit/731dd27edd3b6e006ef2cb47ed9e0d890fbad45a))
* 🎸 ajouter la barre de navigation du bas ([#16](https://github.com/caedes/covoiturage-college/pull/16)) ([68de2ae](https://github.com/caedes/covoiturage-college/commit/68de2ae647eacb665a6c5df9f5d44d0f3ec45f74))
* 🎸 remplacer l'en-tête et le pied de page par la barre du bas ([#16](https://github.com/caedes/covoiturage-college/pull/16)) ([efcb86c](https://github.com/caedes/covoiturage-college/commit/efcb86c91c568cd9202ae0586b7ff46e671dc38b))
* 🎸 titrer « Covoiturage » et fixer le récapitulatif au-dessus de la barre du bas ([#16](https://github.com/caedes/covoiturage-college/pull/16)) ([b51e7f1](https://github.com/caedes/covoiturage-college/commit/b51e7f15c09f8eb2f4eddab0fb9e9908ffe5235c))
* 🎸 revenir sur le jour courant par « Aujourd'hui » ([#16](https://github.com/caedes/covoiturage-college/pull/16)) ([853da62](https://github.com/caedes/covoiturage-college/commit/853da62527c1186611415615ab67bd591239e4c3))


### Corrections

* 🐛 garder l'alerte d'échec au-dessus de la barre du bas ([#16](https://github.com/caedes/covoiturage-college/pull/16)) ([2b467cc](https://github.com/caedes/covoiturage-college/commit/2b467cc2b1e7fe5ce760a9214c9ba8cae30ce017))
* 🐛 garder visible au-dessus des bandeaux l'élément qui reçoit le focus ([#16](https://github.com/caedes/covoiturage-college/pull/16)) ([e386a4b](https://github.com/caedes/covoiturage-college/commit/e386a4b4369ce73271dd163a430f7642b1e47a92))

## [1.1.0](https://github.com/caedes/covoiturage-college/compare/v1.0.0...v1.1.0) (2026-10-05)


### Nouveautés

* 🎸 brancher un build e2e sur les émulateurs firebase et garder la production propre ([#15](https://github.com/caedes/covoiturage-college/pull/15)) ([20ee022](https://github.com/caedes/covoiturage-college/commit/20ee022b23c311346249b347f8547163f6b47ee6))


### Corrections

* 🐛 repérer aussi firestore branché seul sur l'émulateur dans le bundle ([#15](https://github.com/caedes/covoiturage-college/pull/15)) ([3ddb352](https://github.com/caedes/covoiturage-college/commit/3ddb352160fe1e701aa96d8b7658a32f6e45938d))

## [1.0.0](https://github.com/caedes/covoiturage-college/compare/v0.7.0...v1.0.0) (2026-10-02)


### Nouveautés

* 🎸 autoriser les parents à régler les options de leurs enfants ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([cece92d](https://github.com/caedes/covoiturage-college/commit/cece92d0c0d3bf1802434c2cc80ee501381e36e5))
* 🎸 laisser le conducteur remplacé reprendre son trajet ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([61fac65](https://github.com/caedes/covoiturage-college/commit/61fac65ff45858c78f53ac975761353c2aa1ad58))
* 🎸 calculer les options des enfants et qui peut les régler ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([b8161e3](https://github.com/caedes/covoiturage-college/commit/b8161e3f81174420ca223081feff7c76cf8b949a))
* 🎸 enregistrer les options d'une journée dans firestore et le faux dépôt ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([084f06b](https://github.com/caedes/covoiturage-college/commit/084f06b0c80f76d0e6e70b5beeb3a771e23c153b))
* 🎸 rendre réglables la présence, les trajets et la permanence des enfants ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([d48baaa](https://github.com/caedes/covoiturage-college/commit/d48baaa567efea2ecd1b006718c865a7ff3e8cfd))
* 🎸 brancher les options des enfants dans le planning ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([89b1f7f](https://github.com/caedes/covoiturage-college/commit/89b1f7f636dff76d9ba589f97f58b666eadf3d6d))


### Corrections

* 🐛 montrer l'écriture en cours et garder un focus visible et à sa place ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([f442d91](https://github.com/caedes/covoiturage-college/commit/f442d917c006297669627dde5c3483184baa0e54))
* 🐛 corriger les retours de la relecture finale des options des enfants ([#11](https://github.com/caedes/covoiturage-college/pull/11)) ([8b9c19a](https://github.com/caedes/covoiturage-college/commit/8b9c19ae59c86980e2f4b7bb4bc9434cd67ffe1a))

## [0.7.0](https://github.com/caedes/covoiturage-college/compare/v0.6.0...v0.7.0) (2026-09-27)


### Nouveautés

* 🎸 autoriser un parent à prendre, reprendre et annuler un trajet ([#10](https://github.com/caedes/covoiturage-college/pull/10)) ([b686323](https://github.com/caedes/covoiturage-college/commit/b6863234ee79d05a434a6c0843a6d57efdcccd06))
* 🎸 décider des actions de conducteur et de l'issue d'une prise concurrente ([#10](https://github.com/caedes/covoiturage-college/pull/10)) ([cd0b5c5](https://github.com/caedes/covoiturage-college/commit/cd0b5c53288a5aa5b7f54857c5c485cbd4b80036))
* 🎸 écrire les covoiturages en transaction et dans le faux dépôt ([#10](https://github.com/caedes/covoiturage-college/pull/10)) ([db27469](https://github.com/caedes/covoiturage-college/commit/db2746934f2012609f958350753646c8749a160b))
* 🎸 proposer je prends, je le prends et annuler sur les trajets ([#10](https://github.com/caedes/covoiturage-college/pull/10)) ([be171ef](https://github.com/caedes/covoiturage-college/commit/be171efe2d616e3213dac159072d5e2394613f23))


### Corrections

* 🐛 garder le focus et le contraste des boutons de conducteur ([#10](https://github.com/caedes/covoiturage-college/pull/10)) ([f72a1ff](https://github.com/caedes/covoiturage-college/commit/f72a1ff6443f5585439442a3ac915ba784e4c679))
* 🐛 corriger les retours de la relecture finale des conducteurs ([#10](https://github.com/caedes/covoiturage-college/pull/10)) ([df6a88f](https://github.com/caedes/covoiturage-college/commit/df6a88f3c1dfd64aca1d0a0b3d9c0c3c5019ca82))

## [0.6.0](https://github.com/caedes/covoiturage-college/compare/v0.5.0...v0.6.0) (2026-09-27)


### Nouveautés

* 🎸 retenir l'uid du membre connecté ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([73c4d9a](https://github.com/caedes/covoiturage-college/commit/73c4d9a0bac71325e3b5400bce28b6f50d69579c))
* 🎸 ouvrir la lecture des covoiturages et des options aux membres ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([78e9665](https://github.com/caedes/covoiturage-college/commit/78e9665c01cfac39ee0c9ab9abd1c57d9041ab21))
* 🎸 définir le port du planning et lire les documents firestore ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([3675f3a](https://github.com/caedes/covoiturage-college/commit/3675f3ae7de568cf3ce7ac093eb8febd27a34b4e))
* 🎸 rédiger les textes du planning et vérifier le contraste des statuts ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([0ba4f58](https://github.com/caedes/covoiturage-college/commit/0ba4f58d86d813ffcd430e1322aba4f68973e2e4))
* 🎸 ajouter les atomes et molécules du planning ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([53f80ac](https://github.com/caedes/covoiturage-college/commit/53f80ac5f60c6f9058421b1a8f7f14f78d1072cb))
* 🎸 composer les organismes du planning ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([1e79c5d](https://github.com/caedes/covoiturage-college/commit/1e79c5d314524d39b28d11c990844466c562b46c))
* 🎸 afficher le planning de la semaine en lecture ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([8784fdb](https://github.com/caedes/covoiturage-college/commit/8784fdbe407cb14799f930f2716f32671c122771))


### Corrections

* 🐛 nommer le groupe des jours par une légende et le laisser rétrécir ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([160276a](https://github.com/caedes/covoiturage-college/commit/160276a64054fe2cffd67f35c5a21bd28ee89b30))
* 🐛 corriger les retours de la relecture finale du planning ([#9](https://github.com/caedes/covoiturage-college/pull/9)) ([b698c8e](https://github.com/caedes/covoiturage-college/commit/b698c8ede57dc745b87f3a353f60bbb37c6e1e55))

## [0.5.0](https://github.com/caedes/covoiturage-college/compare/v0.4.0...v0.5.0) (2026-09-26)


### Nouveautés

* 🎸 poser les types et les dates du moteur de planning ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([4a19c83](https://github.com/caedes/covoiturage-college/commit/4a19c8343266c4b54142dad6f641a1ba8652cfd4))
* 🎸 déclarer les vacances de la zone A et les jours fériés 2026-2027 ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([c5dfee7](https://github.com/caedes/covoiturage-college/commit/c5dfee76b97ffa170a88f8eb32da24c30244c31a))
* 🎸 calculer les trajets d'un enfant et appliquer les options de sa journée ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([f669ee8](https://github.com/caedes/covoiturage-college/commit/f669ee84405b6388cc4f87dee5f57f60c3a32ed2))
* 🎸 regrouper les enfants en trajets et proposer les permanences ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([33d6222](https://github.com/caedes/covoiturage-college/commit/33d62221cd938fced7f349e0dd056fbd32391905))
* 🎸 résoudre le statut d'un trajet au regard de son covoiturage ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([5409e4f](https://github.com/caedes/covoiturage-college/commit/5409e4f44c89e061f8e3dc3ace2694732d41b0f4))
* 🎸 assembler la semaine de covoiturage et son récapitulatif ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([b3907ba](https://github.com/caedes/covoiturage-college/commit/b3907ba3729b6decaee919a770520b8744e60499))
* 🎸 tenir pour couvert un jour où aucun enfant n'est à transporter ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([0d1f818](https://github.com/caedes/covoiturage-college/commit/0d1f8188d3de1918d545c6f4a5c7048b00ef25c3))


### Corrections

* 🐛 reconnaître le conducteur d'un trajet vidé et attacher les permanences à leur trajet ([#8](https://github.com/caedes/covoiturage-college/pull/8)) ([4069ec9](https://github.com/caedes/covoiturage-college/commit/4069ec9b490c2bd9b0856f77563bf0a1b694e6db))

## [0.4.0](https://github.com/caedes/covoiturage-college/compare/v0.3.0...v0.4.0) (2026-09-26)


### Nouveautés

* 🎸 exposer les enfants d'un parent et l'enfant d'un compte enfant dans la fiche membre ([#7](https://github.com/caedes/covoiturage-college/pull/7)) ([1405b11](https://github.com/caedes/covoiturage-college/commit/1405b116626c33f41873b9265794bf49e10074a2))
* 🎸 ouvrir la lecture des emplois du temps aux membres ([#7](https://github.com/caedes/covoiturage-college/pull/7)) ([a38d3b2](https://github.com/caedes/covoiturage-college/commit/a38d3b2118eaa91af6e893fd05b5ee98e66e403c))
* 🎸 valider le fichier d'import des familles et des emplois du temps ([#7](https://github.com/caedes/covoiturage-college/pull/7)) ([40abfc8](https://github.com/caedes/covoiturage-college/commit/40abfc882220a266bfe65541031a363ba8c3ed60))
* 🎸 calculer les écritures de l'import et protéger l'historique des emplois du temps ([#7](https://github.com/caedes/covoiturage-college/pull/7)) ([b654e05](https://github.com/caedes/covoiturage-college/commit/b654e05cb6e0cd125adcab5f041da3309fee4096))
* 🎸 ajouter le script d'import des familles et des emplois du temps ([#7](https://github.com/caedes/covoiturage-college/pull/7)) ([abed730](https://github.com/caedes/covoiturage-college/commit/abed7306dcddb53564fc4f97f677f42a98417d38))
* 🎸 accepter une famille sans parent inscrit pendant la période de test ([#7](https://github.com/caedes/covoiturage-college/pull/7)) ([4cdca2a](https://github.com/caedes/covoiturage-college/commit/4cdca2afae003b929ba3c8df3309740cac679933))


### Corrections

* 🐛 afficher la cible de l'import et élargir la protection des données réelles ([#7](https://github.com/caedes/covoiturage-college/pull/7)) ([777347a](https://github.com/caedes/covoiturage-college/commit/777347acdc2a775a827465347ff22c463cf81dd1))

## [0.3.0](https://github.com/caedes/covoiturage-college/compare/v0.2.0...v0.3.0) (2026-09-26)


### Nouveautés

* 🎸 installer tailwind v4, le thème trajets collège et les polices barlow ([#6](https://github.com/caedes/covoiturage-college/pull/6)) ([d220b6d](https://github.com/caedes/covoiturage-college/commit/d220b6d6c6943e7d2efd50c2fe7b6ffb69c0c479))
* 🎸 installer shadcn et verrouiller la règle de dépendance atomic design ([#6](https://github.com/caedes/covoiturage-college/pull/6)) ([fec831c](https://github.com/caedes/covoiturage-college/commit/fec831cd181def50403ea5e672be67fa414f10c8))
* 🎸 migrer les écrans d'authentification sur le template et les atomes shadcn ([#6](https://github.com/caedes/covoiturage-college/pull/6)) ([0ef3618](https://github.com/caedes/covoiturage-college/commit/0ef361846cb0d7f82a37048f375ac03f2267b5dc))
* 🎸 restyler le layout et le ranger avec les routes ([#6](https://github.com/caedes/covoiturage-college/pull/6)) ([336a55e](https://github.com/caedes/covoiturage-college/commit/336a55e8d87eccb01d3505e6411bb6ff8a07d38e))


### Corrections

* 🐛 remplacer le texte atténué, sous le seuil de contraste AA, par la couleur secondaire ([#6](https://github.com/caedes/covoiturage-college/pull/6)) ([31b4f34](https://github.com/caedes/covoiturage-college/commit/31b4f34d534bf2502fe71ce59cf0d401a4bc420e))
* 🐛 assombrir le texte atténué du thème pour atteindre le contraste aa ([#6](https://github.com/caedes/covoiturage-college/pull/6)) ([90ccd65](https://github.com/caedes/covoiturage-college/commit/90ccd65a1ba0cc174c0876585dc14bb008e1c568))

## [0.2.0](https://github.com/caedes/covoiturage-college/compare/v0.1.0...v0.2.0) (2026-09-20)


### Nouveautés

* machine à états et ports d'authentification ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([827df5e](https://github.com/caedes/covoiturage-college/commit/827df5ec3947acc9fa01126b8089ec6dc7791847))
* provider d'authentification et faux ports de test ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([150f239](https://github.com/caedes/covoiturage-college/commit/150f2397e98a3bda5a9ff827e55a28591572b290))
* écrans de connexion, refus, chargement et erreur ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([7e200ff](https://github.com/caedes/covoiturage-college/commit/7e200ff635f49e0dc133236cff11179dede45467))
* variables d'environnement Firebase validées par Zod ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([97d60c2](https://github.com/caedes/covoiturage-college/commit/97d60c2d230c5915264787bdf8d2d0b1b884b449))
* adaptateurs Firebase pour l'authentification et la liste blanche ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([dc3a635](https://github.com/caedes/covoiturage-college/commit/dc3a6353fce82d24b363bc4bf3f520f1e531e368))
* porte d'authentification sur l'ensemble des routes ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([a625952](https://github.com/caedes/covoiturage-college/commit/a6259521666eefd001fdfcd506843fa447749ef5))
* déconnexion et identité du membre dans le layout ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([77aebda](https://github.com/caedes/covoiturage-college/commit/77aebda883c3b3c0a228d75b2a3773dace6825dd))
* règles de sécurité Firestore et tests d'émulateur ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([f049f80](https://github.com/caedes/covoiturage-college/commit/f049f80088567aefb33810a8e4553ab6d137bddf))


### Corrections

* éliminer le code mort dans toMember (nullish coalescing inutile) ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([ed94434](https://github.com/caedes/covoiturage-college/commit/ed944346cdb4fe2788b20dd065b74a4bab5ab038))
* 🐛 corrections de la relecture finale (sortie d'erreur, invariant de routes, textes trompeurs, garde CI, ordre de déploiement) ([#3](https://github.com/caedes/covoiturage-college/pull/3)) ([fd79931](https://github.com/caedes/covoiturage-college/commit/fd79931de8484625e75e6f4c6a4a9fd503e5984d))

## 0.1.0 (2026-09-16)


### Nouveautés

* table de routes avec accueil et page 404 ([3b11ca8](https://github.com/caedes/covoiturage-college/commit/3b11ca86c3b38e4ea69fa5f78b98c2335db0ca69))
* layout accessible avec landmarks et lien d'évitement ([c5641bb](https://github.com/caedes/covoiturage-college/commit/c5641bb19bc5e871e9714dc5ce12ac20c4b1b5d3))
* bootstrap navigateur et documentation du socle ([8f0da30](https://github.com/caedes/covoiturage-college/commit/8f0da3052c51de3b5b9a433e9e399cb1f37978d6))

@AGENTS.md

Siempre explicame qe vas a a hacer antes de hacerlo. SIEMPRE

Cuando te pida un commit y push nunca coloques en la descripción nada sobre Claude Code.

NO cambies nada que no te pido especificamente, no tomes decisionse de cambios sin consultar. NO pretendas mejorar cosas que no te pido.

Para crear una migracion siempre revisa de manera exhaustiva las migracioens anteriores asi no generas conflictos.

NUNCA BAJO NINGUN CONCEPTO APLICAR UNA MIGRACION SIN PREGUNTAR.

Si se puede usar un Skill recomendalo.

# Implementacion de UI:
- seguir los Casos de Uso (documentacion/casos_de_uso.md)
- siempre usar los colores y diseño de UI de documentacion/desing_system.md
- El modelo de datos es documentacion/modelo_de_datos.md, si se cambia mantenerlo actualizado.

## Code Standards
- Always use TypeScript strict mode
- Never commit without explicitly asking for permission first
- Follow the existing component structure in 'sIc/components'
- Use named exports, not default exports
- Keep functions under 50 lines, break into smaller units if longer

# Documentacion
- Lee lo que necesites del proyecto en la carpeta documentacion
- Los cambios importantes agregalos a la documentacion

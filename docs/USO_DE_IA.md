# Uso de IA

## Ferramenta Utilizada
**OpenCode** — agente de código utilizado localmente, conectado à **IA-Zecki** (também denominada **AI-Z**), solução de IA local desenvolvida e configurada pelo autor.

## Como funciona
- **IA local:** A IA-Zecki é executada localmente via **Ollama**, com modelos gerenciados pelo próprio autor. 
- **Conexão via OpenCode:** O OpenCode foi configurado para utilizar os modelos da IA-Zecki diretamente na máquina local, atuando como agente para revisão, sugestão e apoio técnico.
- **Integração com VS Code:** A configuração da IA-Zecki também está aplicada ao **VS Code**, permitindo o mesmo fluxo de trabalho no editor.
- **Z-Studio:** Integrada ao **Z-Studio** (`C:\Users\zecki\OneDrive\Documentos\workspace\pessoal\Z-studio`), ambiente utilizado para desenvolvimento e experimentação com IA local.
- **Ambiente de testes:** Validada e configurada no projeto **testes-IA-zecki** (`C:\Users\zecki\OneDrive\Documentos\workspace\pessoal\testes-IA-zecki`), garantindo consistência entre os ambientes.
- **Modelos Claude Local:** Utiliza base **Claude Local** via Ollama, rodando 100% em ambiente local, sem envio desnecessário de código para serviços externos.

## Objetivo
Utilização do **OpenCode + IA-Zecki** para acelerar tarefas técnicas com **revisão humana obrigatória**, mantendo total controle sobre o que é aplicado ao projeto.

## Quando foi utilizada
- **Arquitetura e planejamento:** estruturação do projeto, definição de stack e organização
- **Scaffolding:** geração da estrutura base seguindo os padrões definidos no projeto
- **Revisão de código:** análise crítica, sugestões de melhoria e validação
- **Melhorias de performance:** revisão e aplicação pontual com validação manual
- **Testes:** apoio na criação e validação dos padrões de testes unitários e E2E
- **Documentação:** padronização, revisão e melhoria da escrita técnica
- **Acessibilidade:** revisão e validação com base nas diretrizes WCAG 2.1 A/AA utilizando `@axe-core/playwright`

## Validação
Todo código gerado ou sugerido pelo **OpenCode** com o uso da **IA-Zecki** foi:

- **Revisado manualmente** linha por linha antes de ser aplicado
- **Testado** com `npm run build` e `dotnet build`
- **Validado** com testes unitários e E2E
- **Verificado** contra o design do Figma
- **Conferido** quanto à acessibilidade com `@axe-core/playwright`
- **Ajustado** quando necessário para seguir exatamente os padrões e requisitos do projeto

## Princípio
A **IA-Zecki** foi utilizada como **ferramenta de revisão e apoio técnico local**, integrada ao **OpenCode** na própria máquina. Todas as decisões de implementação, alterações e commits foram feitas e validadas pelo desenvolvedor, demonstrando domínio na configuração e utilização de um ambiente local de IA.

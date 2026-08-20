# Memento Mori Protocol — Especificação do App Mobile

## 0. Objetivo

Criar um aplicativo mobile de treino baseado exatamente nas fichas que serão fornecidas neste arquivo.

O aplicativo deve ser simples, rápido e focado em:

**Treino → Registro → Logbook → Progressão**

Não quero um clone cheio de funcionalidades do Hevy.

A ideia é transformar minha ficha atual em um aplicativo mobile inteligente.

O usuário informa a **carga de trabalho (Working Set)** da última sessão e o aplicativo calcula automaticamente os Feeders e as demais séries que dependem da WS.

O usuário registra o que realmente fez e o aplicativo salva tudo no **Logbook**.

---

# 1. Stack

Utilizar preferencialmente:

- **TypeScript**
- **React** para a interface
- **Fastify** para o backend/API
- Banco de dados relacional, preferencialmente PostgreSQL
- ORM: Prisma, se fizer sentido para o projeto
- Frontend mobile-first

Se o projeto existente já tiver uma stack funcional, primeiro analisar o projeto e reutilizar o que fizer sentido. Não trocar tecnologias sem necessidade.

A arquitetura deve ser simples, organizada e escalável.

Sugestão:

```text
frontend/
  src/
    components/
    pages/
    hooks/
    services/
    types/
    utils/

backend/
  src/
    routes/
    services/
    engines/
    calculators/
    repositories/
    types/

docs/
  memento-mori.md
  workouts.md
```

Se houver uma estrutura melhor para o projeto existente, adaptar sem criar complexidade desnecessária.

---

# 2. PRINCÍPIO MAIS IMPORTANTE

As fichas abaixo são a **estrutura definitiva dos meus treinos**.

Não inventar exercícios.

Não remover exercícios.

Não alterar a ordem.

Não adicionar séries.

Não remover séries.

Não trocar Rep Range.

Não colocar Top Set onde não existe.

Não colocar Back Off onde não existe.

Não colocar Rest Pause onde não existe.

Cada exercício precisa reproduzir exatamente a estrutura definida abaixo.

---

# 3. CARGAS

As imagens originais possuem cargas de sessões anteriores, mas **não usar essas cargas como valores iniciais obrigatórios do aplicativo**.

Eu vou informar manualmente a carga da última sessão quando utilizar o aplicativo.

Exemplo:

```text
Carga de Trabalho
[ 50 kg ]
```

Depois de informar 50 kg, o sistema calcula os Feeders e outras séries derivadas.

A carga realmente utilizada também poderá ser alterada durante o treino.

---

# 4. CONCEITO DE CARGA DE TRABALHO

A Working Set (WS) é a série principal do exercício.

Tudo que depender de porcentagem deve ser calculado com base na WS.

Exemplo:

```text
WS = 100 kg

Feeder 1 = 50 kg
Feeder 2 = 70 kg
Feeder 3 = 85–90 kg
```

A carga da WS não deve aumentar no meio da sessão apenas porque uma série foi concluída.

A progressão calculada é para a **próxima sessão**.

---

# 5. FEEDER SETS

Os Feeder Sets são séries de preparação.

Utilizar entre 50% e 90% da carga da Working Set.

As porcentagens devem ser calculadas sempre com base na WS.

## 3 Feeders

```text
Feeder 1 = 50%
Feeder 2 = 70%
Feeder 3 = 85–90%
```

## 2 Feeders

```text
Feeder 1 = 70%
Feeder 2 = 85–90%
```

## 1 Feeder

```text
Feeder 1 = 85%
```

As repetições dos Feeders devem respeitar exatamente o Rep Range definido na ficha.

Normalmente são 3–5 reps.

Os Feeders não devem ser realizados até a falha.

---

# 6. WORKING SETS

A carga da Working Set deve ser a carga de trabalho definida para aquele exercício.

Exemplo:

```text
Carga de Trabalho: 50 kg

Working Set 1
50 kg × 8

Working Set 2
50 kg × 8
```

Se houver 3 Working Sets:

```text
Working Set 3
50 kg × 8
```

O aplicativo deve manter a mesma carga durante as WS da sessão, salvo se o usuário alterar manualmente o peso realizado.

---

# 7. REP RANGE

Preservar exatamente o Rep Range da ficha.

Exemplos:

```text
3–5
8
8–12
10–15
5–8
6–8
3
```

Não transformar:

`8–12` em `8`.

Não transformar:

`3–5` em `3`.

O Rep Range planejado é diferente das reps realmente realizadas.

Exemplo:

```text
Rep Range: 8–12
Reps realizadas: 10
```

---

# 8. LOGBOOK

O Logbook é obrigatório.

Cada treino concluído deve salvar:

- data
- ficha
- exercício
- tipo da série
- ordem da série
- carga planejada
- carga realmente utilizada
- Rep Range planejado
- reps realizadas
- observações, quando existirem

O histórico deve ser preservado mesmo se a configuração do exercício mudar posteriormente.

Portanto, o Logbook deve armazenar um snapshot do que aconteceu naquela sessão.

---

# 9. ÚLTIMA SESSÃO DENTRO DO TREINO

Durante o treino, mostrar rapidamente o resultado anterior do exercício.

Exemplo:

```text
SUPINO RETO

Hoje
50 kg × 8
50 kg × 8

Última sessão
47,5 kg × 8
47,5 kg × 8
```

O usuário não deve precisar sair do treino para consultar o histórico.

---

# 10. PROGRESSÃO

A progressão deve seguir as regras do Memento Mori Protocol.

Só recomendar aumento quando os critérios estiverem 100%:

- controle da carga
- reps de folga
- feeling do dia
- reps limpas

O material do protocolo explica que, se a série tem 8 reps propostas, o objetivo para liberar progressão é ter aproximadamente 2 reps de folga, ou seja, conseguir realizar 10 reps com execução adequada.

A progressão deve acontecer na próxima sessão, nunca automaticamente no meio do treino atual.

Exemplo:

```text
Hoje:
100 kg × 10
100 kg × 10

Próxima sessão:
+1% a +5%
```

O sistema deve mostrar o motivo da recomendação.

Exemplo:

```text
PROGRESSÃO LIBERADA

Você atingiu a meta com controle e margem adequada.

Próxima sessão:
102,5 kg
```

Se não atingir:

```text
CARGA MANTIDA

Os critérios de progressão ainda não foram atingidos.
```

---

# 11. TOP SET

Se e somente se o exercício tiver Top Set na ficha, criar essa série.

Regras:

### Exercícios livres

Top Set entre aproximadamente 1% e 5% acima da carga realizada na WS.

Exemplo:

```text
WS = 100 kg

Top Set = 101–105 kg
```

### Máquinas

Top Set entre aproximadamente 5% e 10% acima da carga realizada na WS.

Exemplo:

```text
WS = 100 kg

Top Set = 105–110 kg
```

A carga final deve respeitar o incremento configurado do equipamento.

---

# 12. BACK OFF

Se e somente se o exercício tiver Back Off na ficha, criar essa série.

Exemplo:

```text
WS = 100 kg
Back Off = 90%

100 × 0,90 = 90 kg
```

Mostrar:

```text
Back Off
90 kg × 8–12
```

---

# 13. REST PAUSE

Se e somente se o exercício tiver Rest Pause na ficha:

1. realizar a série até a falha;
2. descansar 20 segundos;
3. repetir até a falha;
4. registrar as reps realizadas.

O aplicativo deve ter um timer simples de 20 segundos.

---

# 14. AQUECIMENTO

Quando a ficha possuir "Aquecimento", mostrar como uma série separada dos Feeders.

Não tratar Aquecimento como Feeder.

A regra matemática específica do aquecimento deve ser configurável.

---

# 15. AMPLITUDE

Todos os exercícios devem ser realizados com amplitude total, conforme o protocolo.

Mostrar essa informação no exercício de maneira discreta.

---

# 16. FICHAS DEFINITIVAS

## TREINO 1

A ordem e a estrutura abaixo são definitivas.

### 1. T Bar Row

```text
Aquecimento: 10–15
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Feeder Set 3: 3–5
Working Set 1: 8
Working Set 2: 8
Back Off: 8–12
```

### 2. Remada baixa / remada com cabo

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Top Set: 6–8
```

### 3. Supino Inclinado

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Feeder Set 3: 3–5
Working Set 1: 8
Working Set 2: 8
```

### 4. Supino reto máquina

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Top Set: 6–8
```

### 5. Desenvolvimento

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Top Set: 6–8
```

### 6. Tríceps polia alta

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

### 7. Tríceps polia alta / variação com Rest Pause

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Rest Pause: 8–12
```

---

# 17. TREINO 2

### 1. RDL

```text
Aquecimento: 10–15
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
Back Off: 8–12
```

### 2. Cadeira flexora

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
```

### 3. Hack Squat

```text
Feeder Set 1: 3–5
Feeder Set 2: 3
Feeder Set 3: 3
Working Set 1: 8
Top Set: 6–8
```

### 4. Cadeira extensora

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Rest Pause: 8
```

### 5. Bíceps rosca polia

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

### 6. Bíceps rosca unilateral

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

---

# 18. TREINO 3

### 1. Remada curvada

```text
Aquecimento: 10–15
Feeder Set 1: 3
Feeder Set 2: 3
Feeder Set 3: 3
Working Set 1: 8
Working Set 2: 8
Back Off: 8–12
```

### 2. Puxada alta / puxada na pegada indicada pela ficha

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Rest Pause: 8
```

### 3. Supino Inclinado

```text
Feeder Set 1: 3
Feeder Set 2: 3
Feeder Set 3: 3
Working Set 1: 8
Top Set: 6–8
```

### 4. Supino reto máquina

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
```

### 5. Tríceps polia alta

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
Working Set 3: 8–12
```

### 6. Tríceps francês

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Rest Pause: 8–12
```

### 7. Elevação unilateral

```text
Feeder Set 1: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
Working Set 3: 8–12
```

---

# 19. TREINO 4

### 1. Cadeira flexora

```text
Aquecimento: 10–15
Feeder Set 1: 3
Feeder Set 2: 3
Working Set 1: 8
Top Set: 6–8
```

### 2. Agachamento Smith

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Feeder Set 3: 3–5
Working Set 1: 8
Top Set: 6–8
```

### 3. Cadeira extensora

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
Top Set: 6–8
```

### 4. Elevação pélvica

```text
Feeder Set 1: 3
Feeder Set 2: 3
Feeder Set 3: 3
Working Set 1: 8
Top Set: 6–8
```

### 5. Mesa flexora

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Rest Pause: 8
```

### 6. Bíceps rosca polia

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

### 7. Bíceps rosca unilateral

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Rest Pause: 8
```

---

# 20. TREINO 5

### 1. Remada máquina

```text
Aquecimento: 10–15
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
Back Off: 8–12
```

### 2. T Bar Row máquina

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Top Set: 6–8
```

### 3. Supino Inclinado

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Feeder Set 3: 3–5
Working Set 1: 8
Top Set: 6–8
```

### 4. Supino reto máquina

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
```

### 5. Desenvolvimento

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
```

### 6. Tríceps polia alta

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

### 7. Tríceps cruzado na polia

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Rest Pause: 8–12
```

---

# 21. TREINO 6

### 1. Cadeira flexora

```text
Aquecimento: 10–15
Feeder Set 1: 3
Feeder Set 2: 3
Working Set 1: 8
Top Set: 6–8
```

### 2. Leg Press 45°

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Feeder Set 3: 3–5
Working Set 1: 8
Top Set: 6–8
```

### 3. Sumo Deadlift

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 5–8
Top Set: 3–5
Back Off: 3–8
```

### 4. Cadeira extensora

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8
Working Set 2: 8
```

### 5. Bíceps rosca polia

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

### 6. Bíceps rosca martelo

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

### 7. Elevação lateral

```text
Feeder Set 1: 3–5
Feeder Set 2: 3–5
Working Set 1: 8–12
Working Set 2: 8–12
```

---

# 22. OBSERVAÇÃO SOBRE NOMES CORTADOS NAS IMAGENS

Alguns nomes nas imagens estão visualmente truncados pela largura da planilha, por exemplo:

- "Remada baixa co..."
- "Puxada alta (peg...)"
- "Tríceps polia alta..."
- "Tríceps cruzado p..."
- "Elevação unilater..."
- "Bíceps rosca pol..."
- "Bíceps rosca uni..."
- "Elevação lateral c..."
- "Remada máquina..."
- "T bar row máquina..."

Quando houver dúvida sobre o nome completo, preservar o nome que eu fornecer no cadastro final em vez de inventar.

O que é obrigatório preservar mesmo quando o nome estiver truncado é a estrutura das séries.

---

# 23. MODELO DE DADOS

Criar entidades semelhantes a:

```text
WorkoutPlan
WorkoutDay
Exercise
ExerciseSetTemplate
WorkoutSession
WorkoutExercise
WorkoutSet
LogbookEntry
ProgressionResult
```

Um exercício deve possuir:

```text
id
name
order
equipmentType
videoUrl
workingWeight
increment
sets
```

Cada template de série deve possuir:

```text
type
order
repRangeMin
repRangeMax
percentage
```

Tipos:

```text
WARMUP
FEEDER
WORKING
TOP_SET
BACK_OFF
REST_PAUSE
```

---

# 24. CONFIGURAÇÃO DE CARGA

O usuário deve conseguir informar:

```text
Carga de Trabalho
[ 50 ]
```

e escolher a unidade:

```text
kg
```

O aplicativo deve calcular:

```text
Feeder 1
Feeder 2
Feeder 3
```

conforme a quantidade existente no exercício.

As Working Sets utilizam a carga de trabalho.

Top Set e Back Off são calculados somente quando existirem na ficha.

---

# 25. ARREDONDAMENTO

Permitir configurar o incremento do equipamento.

Exemplos:

```text
1 kg
2 kg
2,5 kg
5 kg
```

Se um cálculo resultar em um valor que o equipamento não permite, arredondar para um incremento válido.

Centralizar essa lógica.

---

# 26. INTERFACE MOBILE

A tela principal do treino deve ser muito simples.

Exemplo:

```text
UPPER A

┌─────────────────────────┐
│ T BAR ROW               │
│ Última: 50 × 8 × 8      │
│                         │
│ Carga de trabalho       │
│ 50 kg                   │
│                         │
│ Feeder 1   25 kg  3–5   │
│ Feeder 2   35 kg  3–5   │
│ Feeder 3   45 kg  3–5   │
│                         │
│ WS 1       50 kg  8     │
│ Reps: [ 8 ]             │
│                         │
│ WS 2       50 kg  8     │
│ Reps: [ 8 ]             │
│                         │
│ Back Off   45 kg  8–12  │
│ Reps: [   ]             │
└─────────────────────────┘
```

Não transformar isso em uma tabela desktop.

---

# 27. NAVEGAÇÃO

Criar somente:

- Treino
- Fichas
- Logbook
- Progressão
- Configurações

Durante o treino, priorizar o treino atual.

---

# 28. TELA DE LOGBOOK

Permitir pesquisar/selecionar um exercício e ver:

```text
SUPINO RETO

20/08
50 kg × 8
50 kg × 8

13/08
47,5 kg × 8
47,5 kg × 8

06/08
47,5 kg × 7
47,5 kg × 8
```

Mostrar também a evolução de carga quando fizer sentido.

---

# 29. FINALIZAR TREINO

Botão:

```text
MARCAR TREINO COMO CONCLUÍDO
```

Ao finalizar:

1. validar registros;
2. salvar sessão;
3. salvar todas as séries realizadas;
4. atualizar Logbook;
5. analisar progressão;
6. calcular recomendações futuras;
7. mostrar resumo.

---

# 30. RESUMO

Depois do treino:

```text
TREINO CONCLUÍDO

7 exercícios

Progressões:
Supino +2,5 kg
Remada mantida
Desenvolvimento mantido

Próximo treino:
cargas preparadas automaticamente
```

---

# 31. TESTES

Criar testes unitários para:

## Feeder

```text
WS = 100

3 feeders:
50
70
85–90
```

```text
WS = 100

2 feeders:
70
85–90
```

```text
WS = 100

1 feeder:
85
```

## Back Off

```text
100 × 90% = 90
```

## Top Set

Livre:

```text
100 → 101–105
```

Máquina:

```text
100 → 105–110
```

## Rest Pause

Verificar timer de 20 segundos.

## Logbook

Garantir que o histórico preserve:

- data
- peso planejado
- peso realizado
- reps planejadas
- reps realizadas
- tipo de série

---

# 32. NÃO FAZER

Não criar:

- rede social
- seguidores
- feed
- comunidade
- dieta
- contador de calorias
- passos
- funcionalidades de smartwatch
- gamificação exagerada
- excesso de gráficos
- funcionalidades sem relação com o treino

O aplicativo deve continuar simples.

---

# 33. ORDEM DE IMPLEMENTAÇÃO

Implementar nesta ordem:

## Fase 1 — Análise

1. analisar projeto;
2. identificar stack;
3. identificar banco;
4. identificar arquitetura existente.

Não alterar nada antes dessa análise.

## Fase 2 — Estrutura

5. criar modelos;
6. criar fichas;
7. criar exercícios;
8. criar templates de séries.

## Fase 3 — Treino

9. tela de treino;
10. cards de exercícios;
11. campo de carga de trabalho;
12. cálculo de Feeders;
13. registro de reps;
14. registro de carga realizada.

## Fase 4 — Logbook

15. persistência;
16. histórico;
17. última sessão dentro do exercício.

## Fase 5 — Progressão

18. progressionEngine;
19. Top Set;
20. Back Off;
21. Rest Pause;
22. próxima carga.

## Fase 6 — Refinamento

23. UX mobile;
24. estados de loading;
25. erros;
26. validações;
27. testes;
28. revisão final.

---

# 34. REGRA PARA O CODEX

Antes de começar a implementar, leia este arquivo inteiro.

Depois:

1. analise o projeto atual;
2. apresente um plano;
3. não invente dados;
4. não altere as fichas;
5. não implemente regras que não estejam especificadas;
6. mantenha o motor de cálculo separado da UI;
7. escreva testes para os cálculos;
8. mantenha o código simples.

Quando houver uma informação ambígua nas fichas, não inventar silenciosamente.

Perguntar antes de alterar a estrutura.

---

# 35. RESULTADO FINAL

O aplicativo deve funcionar assim:

```text
EU ABRO O TREINO
        ↓
ESCOLHO O EXERCÍCIO
        ↓
INFORMO A CARGA DE TRABALHO
        ↓
APP CALCULA OS FEEDERS
        ↓
APP MOSTRA AS WORKING SETS
        ↓
SE EXISTIR:
TOP SET
BACK OFF
REST PAUSE
        ↓
EU REGISTRO O QUE FIZ
        ↓
APP SALVA NO LOGBOOK
        ↓
APP ANALISA O DESEMPENHO
        ↓
APP CALCULA A PRÓXIMA CARGA
        ↓
PRÓXIMO TREINO JÁ ESTÁ PREPARADO
```

A filosofia é:

**Minha ficha → Meu treino → Meu Logbook → Minha progressão.**

Simples na interface.

Preciso na lógica.

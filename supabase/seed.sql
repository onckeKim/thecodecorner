-- =============================================================================
-- The Code Corner — DEVELOPMENT SEED DATA
--
-- Temporary demo curriculum so the platform can be built and tested before the
-- real curriculum is written. Everything here is ordinary database content and can
-- be replaced through the admin CMS later.
--
-- `supabase db reset` runs this automatically for a local stack. For a hosted
-- project, run it once in the SQL editor (it is safe to re-run: existing rows are
-- left alone).
--
-- Prerequisites are switched OFF here so every course can be tested without
-- completing the earlier ones. Turn them on from /admin or with:
--   update public.platform_settings set value = 'true' where key = 'enforce_prerequisites';
-- =============================================================================

update public.platform_settings set value = 'false'::jsonb where key = 'enforce_prerequisites';

-- -----------------------------------------------------------------------------
-- Learning path
-- -----------------------------------------------------------------------------
insert into public.learning_paths (slug, title, summary, description, level, estimated_hours, icon, sort_order, status, created_by)
values (
  'data-analyst',
  'Data Analyst',
  'Go from spreadsheet basics to SQL, Power BI dashboards and a portfolio-ready capstone project.',
  'A structured path for aspiring data analysts. You start with the fundamentals of working with data, build practical skills in Excel, SQL and Power BI, and finish with a capstone project that brings everything together.',
  'beginner', 80, 'chart', 1, 'published', null
)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Courses (completed in order: each course requires the previous one)
-- -----------------------------------------------------------------------------
insert into public.courses (path_id, slug, title, summary, level, estimated_hours, icon, theme, sort_order, status, created_by)
select p.id, c.slug, c.title, c.summary, c.level::public.difficulty_level, c.hours, c.icon, c.theme, c.sort_order, 'published', null
from public.learning_paths p
cross join (values
  ('data-fundamentals',        'Data Fundamentals',        'What data analysis is, what analysts do, and the core ideas behind datasets and KPIs.', 'beginner',     6,  'DF', null,      1),
  ('excel-for-data-analysis',  'Excel for Data Analysis',  'Formulas, lookups, cleaning and pivot tables: the everyday toolkit of an analyst.',       'beginner',     16, 'XL', 'excel',   2),
  ('sql-for-data-analysis',    'SQL for Data Analysis',    'Query relational databases: filter, join, aggregate and summarise data with SQL.',     'intermediate', 20, 'SQL', 'sql',    3),
  ('power-bi',                 'Power BI',                 'Model data, write DAX measures and build clear, interactive dashboards.',              'intermediate', 20, 'BI', 'powerbi', 4),
  ('data-analyst-capstone',    'Data Analyst Capstone',    'Apply everything in an end-to-end analysis project you can add to your portfolio.',    'advanced',     18, '★',  'dax',     5)
) as c(slug, title, summary, level, hours, icon, theme, sort_order)
where p.slug = 'data-analyst'
on conflict (path_id, slug) do nothing;

insert into public.course_prerequisites (course_id, required_course_id)
select c.id, prev.id
from public.courses c
join public.courses prev on prev.path_id = c.path_id and prev.sort_order = c.sort_order - 1
join public.learning_paths p on p.id = c.path_id
where p.slug = 'data-analyst'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Modules
-- -----------------------------------------------------------------------------
insert into public.modules (course_id, slug, title, summary, estimated_minutes, sort_order, status, created_by)
select c.id, m.slug, m.title, m.summary, m.minutes, m.sort_order, m.status::public.content_status, null
from public.courses c
join public.learning_paths p on p.id = c.path_id and p.slug = 'data-analyst'
join (values
  ('data-fundamentals',       'introduction-to-data-analysis', 'Introduction to Data Analysis', 'The role, the process and the vocabulary of data analysis.',        60, 1, 'published'),
  ('data-fundamentals',       'working-with-data',             'Working with Data',             'Data types, data quality and tidy data.',                            45, 2, 'published'),
  ('excel-for-data-analysis', 'excel-essentials',              'Excel Essentials',              'Workbooks, formulas, references and lookups.',                       90, 1, 'published'),
  ('sql-for-data-analysis',   'sql-fundamentals',              'SQL Fundamentals',              'Your first queries: selecting, filtering and sorting data.',         90, 1, 'published'),
  ('power-bi',                'getting-started-with-power-bi', 'Getting Started with Power BI', 'The Power BI workflow from loading data to publishing a report.',    60, 1, 'published'),
  ('data-analyst-capstone',   'capstone-project',              'Capstone Project',              'The brief, the dataset and how your project will be assessed.',      30, 1, 'published')
) as m(course_slug, slug, title, summary, minutes, sort_order, status) on m.course_slug = c.slug
on conflict (course_id, slug) do nothing;

-- -----------------------------------------------------------------------------
-- Lessons
-- -----------------------------------------------------------------------------
insert into public.lessons (module_id, slug, title, summary, lesson_type, estimated_minutes, xp_reward, sort_order, status, created_by, content)
select m.id, l.slug, l.title, l.summary, 'article', l.minutes, l.xp, l.sort_order, 'published', null, l.content::jsonb
from public.modules m
join public.courses c on c.id = m.course_id
join public.learning_paths p on p.id = c.path_id and p.slug = 'data-analyst'
join (values
-- Data Fundamentals › Introduction to Data Analysis ---------------------------
('introduction-to-data-analysis', 'what-is-data-analysis', 'What is Data Analysis?',
 'How raw data becomes information that supports better decisions.', 10, 10, 1, $json$[
  {"type":"paragraph","text":"**Data analysis** is the process of inspecting, cleaning, transforming and modelling data to discover useful information, draw conclusions and support decision-making."},
  {"type":"heading","text":"From data to decisions"},
  {"type":"paragraph","text":"Organisations collect huge amounts of data: sales transactions, website visits, survey answers, sensor readings. On its own, that data rarely tells you what to do. Analysis turns it into answers to questions such as *which products are growing?* or *why did customer complaints rise last month?*"},
  {"type":"list","style":"number","items":[
    "**Ask:** define the question and how the answer will be used.",
    "**Prepare:** find and collect the data you need.",
    "**Process:** clean it, fix errors and handle missing values.",
    "**Analyse:** explore, summarise and look for patterns.",
    "**Share:** communicate findings with clear visuals.",
    "**Act:** help stakeholders make a decision."
  ]},
  {"type":"callout","variant":"hint","title":"Remember","text":"Good analysis starts with a good question. A precise question makes it obvious which data you need."},
  {"type":"heading","text":"Four types of analysis"},
  {"type":"table","columns":["Type","Question it answers","Example"],"rows":[
    ["Descriptive","What happened?","Monthly revenue report"],
    ["Diagnostic","Why did it happen?","Drill-down into a sales dip by region"],
    ["Predictive","What is likely to happen?","Forecasting next quarter's demand"],
    ["Prescriptive","What should we do?","Recommending optimal stock levels"]
  ]}
]$json$),
('introduction-to-data-analysis', 'what-does-a-data-analyst-do', 'What Does a Data Analyst Do?',
 'Day-to-day responsibilities, tools and the skills employers look for.', 10, 10, 2, $json$[
  {"type":"paragraph","text":"A data analyst helps people make better decisions by finding, preparing and explaining data. The job sits between the business (the people asking questions) and the data (where the answers live)."},
  {"type":"heading","text":"A typical week"},
  {"type":"list","style":"bullet","items":[
    "Meeting stakeholders to understand what they need to know",
    "Writing SQL queries to extract data from databases",
    "Cleaning and reshaping data in Excel or Power Query",
    "Building and maintaining dashboards in Power BI",
    "Presenting findings and recommendations"
  ]},
  {"type":"heading","text":"Core toolkit"},
  {"type":"key_terms","items":[
    {"term":"Excel","definition":"Quick analysis, ad-hoc calculations and sharing small datasets."},
    {"term":"SQL","definition":"Querying data stored in relational databases."},
    {"term":"Power BI","definition":"Data modelling, DAX measures and interactive reports."},
    {"term":"Communication","definition":"Turning numbers into a clear story that leads to action."}
  ]},
  {"type":"callout","variant":"success","title":"You are on the right path","text":"This learning path covers each of these tools in the order most analysts use them."}
]$json$),
('introduction-to-data-analysis', 'understanding-datasets', 'Understanding Datasets',
 'Rows, columns, data types and what makes a dataset easy to analyse.', 12, 10, 3, $json$[
  {"type":"paragraph","text":"A **dataset** is a structured collection of data, usually arranged as a table. Each **row** is one record (an order, a customer, a day) and each **column** is one attribute of that record."},
  {"type":"table","caption":"orders: a small example dataset","columns":["order_id","order_date","customer","region","amount"],"rows":[
    ["1001","2024-03-01","Northwind Cafe","North","120.50"],
    ["1002","2024-03-01","Atlas Books","South","89.00"],
    ["1003","2024-03-02","Harbor & Co","North","240.00"]
  ]},
  {"type":"heading","text":"Common data types"},
  {"type":"list","style":"bullet","items":[
    "**Numeric:** quantities and amounts you can calculate with (`amount`)",
    "**Text:** names, categories and descriptions (`customer`, `region`)",
    "**Date/time:** when something happened (`order_date`)",
    "**Boolean:** true/false flags (`is_returned`)"
  ]},
  {"type":"callout","variant":"hint","title":"Tidy data","text":"Each variable is a column, each observation is a row, and each value sits in its own cell. Tidy datasets are much easier to filter, group and chart."}
]$json$),
('introduction-to-data-analysis', 'understanding-kpis', 'Understanding KPIs',
 'Choosing and calculating key performance indicators that matter.', 12, 15, 4, $json$[
  {"type":"paragraph","text":"A **key performance indicator (KPI)** is a measurable value that shows how effectively an organisation is achieving an important objective."},
  {"type":"heading","text":"What makes a good KPI?"},
  {"type":"list","style":"bullet","items":[
    "**Aligned:** tied directly to a business goal",
    "**Measurable:** calculated the same way every time",
    "**Actionable:** someone can influence it",
    "**Timely:** available often enough to act on"
  ]},
  {"type":"heading","text":"Examples"},
  {"type":"table","columns":["KPI","Formula"],"rows":[
    ["Conversion rate","orders ÷ website sessions"],
    ["Average order value","revenue ÷ number of orders"],
    ["Customer churn rate","customers lost ÷ customers at start of period"],
    ["Gross margin %","(revenue − cost of goods) ÷ revenue"]
  ]},
  {"type":"code","language":"sql","filename":"kpi.sql","code":"-- Average order value for March 2024\nSELECT SUM(amount) / COUNT(*) AS avg_order_value\nFROM orders\nWHERE order_date BETWEEN '2024-03-01' AND '2024-03-31';"},
  {"type":"callout","variant":"error","title":"Watch out","text":"A KPI without context can mislead. Always compare against a target, a previous period or a benchmark."}
]$json$),
-- Data Fundamentals › Working with Data ----------------------------------------
('working-with-data', 'data-quality-basics', 'Data Quality Basics',
 'Spotting and fixing the most common data quality problems.', 10, 10, 1, $json$[
  {"type":"paragraph","text":"Analysis is only as good as the data behind it. Before analysing anything, check for these common problems."},
  {"type":"list","style":"bullet","items":[
    "**Missing values:** empty cells or NULLs",
    "**Duplicates:** the same record entered twice",
    "**Inconsistent formats:** `UK`, `U.K.` and `United Kingdom` in the same column",
    "**Outliers:** values far outside the normal range that may be errors"
  ]},
  {"type":"callout","variant":"hint","title":"Rule of thumb","text":"Never delete data you don't understand. Flag it, investigate it, then decide."}
]$json$),
('working-with-data', 'structured-vs-unstructured-data', 'Structured vs Unstructured Data',
 'Where data comes from and how its shape affects analysis.', 8, 10, 2, $json$[
  {"type":"paragraph","text":"**Structured data** fits neatly into rows and columns, as in a database table or a spreadsheet. **Unstructured data** such as emails, images and free text does not have a predefined model."},
  {"type":"table","columns":["","Structured","Unstructured"],"rows":[
    ["Examples","Sales tables, CRM records","Emails, PDFs, social posts"],
    ["Stored in","Databases, spreadsheets","Files, data lakes"],
    ["Analysed with","SQL, Excel, Power BI","Text analytics, machine learning"]
  ]},
  {"type":"paragraph","text":"Most data analyst work focuses on structured data, which is why SQL and Excel are so central to the role."}
]$json$),
-- Excel for Data Analysis › Excel Essentials -------------------------------------
('excel-essentials', 'navigating-workbooks', 'Navigating Workbooks',
 'Workbooks, worksheets, cells, ranges and tables.', 10, 10, 1, $json$[
  {"type":"paragraph","text":"An Excel **workbook** contains one or more **worksheets**. Each worksheet is a grid of **cells** identified by column letter and row number, such as `B3`."},
  {"type":"list","style":"bullet","items":[
    "A **range** is a block of cells, such as `A1:D20`",
    "Convert ranges to **Excel Tables** (Ctrl+T) so formulas and pivot tables grow with your data",
    "Freeze the header row so column names stay visible as you scroll"
  ]}
]$json$),
('excel-essentials', 'formulas-and-references', 'Formulas and References',
 'Relative, absolute and mixed references and why they matter.', 15, 15, 2, $json$[
  {"type":"paragraph","text":"Every formula starts with `=`. When you copy a formula, Excel adjusts its cell references unless you lock them with `$`."},
  {"type":"table","columns":["Reference","When copied…"],"rows":[
    ["A1","column and row both change"],
    ["$A$1","nothing changes (absolute)"],
    ["$A1","column fixed, row changes"],
    ["A$1","row fixed, column changes"]
  ]},
  {"type":"code","language":"excel","filename":"formula","code":"=B2*$F$1"},
  {"type":"callout","variant":"hint","text":"Press F4 while editing a reference to cycle through the four reference types."}
]$json$),
('excel-essentials', 'lookups-with-xlookup', 'Lookups with XLOOKUP',
 'Find values in another table with XLOOKUP.', 15, 15, 3, $json$[
  {"type":"paragraph","text":"`XLOOKUP` searches one range and returns the matching value from another. Unlike `VLOOKUP`, it defaults to an exact match and can look in any direction."},
  {"type":"code","language":"excel","filename":"formula","code":"=XLOOKUP(E2, Products[Code], Products[Price], \"Not found\")"},
  {"type":"list","style":"number","items":["The value to find","Where to look for it","What to return","What to show if nothing matches (optional)"]}
]$json$),
-- SQL for Data Analysis › SQL Fundamentals -------------------------------------
('sql-fundamentals', 'what-is-sql', 'What is SQL?',
 'Relational databases and the language used to query them.', 10, 10, 1, $json$[
  {"type":"paragraph","text":"**SQL** (Structured Query Language) is the standard language for working with relational databases. Analysts use it to retrieve exactly the data they need, even from tables with millions of rows."},
  {"type":"paragraph","text":"A relational database stores data in tables that are linked by **keys**. A customer's `id` in the `customers` table appears as `customer_id` in the `orders` table, which lets you join the two."},
  {"type":"code","language":"sql","filename":"first-query.sql","code":"SELECT name, city\nFROM customers;"}
]$json$),
('sql-fundamentals', 'selecting-columns', 'Selecting Columns',
 'Choose which columns a query returns and give them clear names.', 10, 10, 2, $json$[
  {"type":"paragraph","text":"`SELECT` lists the columns you want; `FROM` names the table. Use `AS` to rename a column in the result."},
  {"type":"code","language":"sql","filename":"select.sql","code":"SELECT name,\n       price,\n       price * 1.2 AS price_incl_vat\nFROM products;"},
  {"type":"callout","variant":"hint","text":"Avoid SELECT * in production queries. Naming columns makes queries faster and easier to read."}
]$json$),
('sql-fundamentals', 'filtering-data-with-where', 'Filtering Data with WHERE',
 'Return only the rows that match your conditions.', 15, 15, 3, $json$[
  {"type":"paragraph","text":"`WHERE` filters rows **before** they are returned. Combine conditions with `AND` and `OR`, and use `IN`, `BETWEEN` and `LIKE` for common patterns."},
  {"type":"code","language":"sql","filename":"where.sql","code":"SELECT name, city\nFROM customers\nWHERE city = 'Amsterdam'\n  AND signup_date >= '2024-01-01';"},
  {"type":"table","columns":["Operator","Example"],"rows":[
    ["=, <>, <, >","price > 50"],
    ["IN","city IN ('Utrecht', 'Rotterdam')"],
    ["BETWEEN","order_date BETWEEN '2024-01-01' AND '2024-03-31'"],
    ["LIKE","email LIKE '%@example.com'"],
    ["IS NULL","email IS NULL"]
  ]},
  {"type":"callout","variant":"error","title":"Common mistake","text":"WHERE email = NULL never matches anything. Comparisons with NULL are unknown, so use IS NULL."}
]$json$),
('sql-fundamentals', 'sorting-results', 'Sorting Results',
 'Order query results with ORDER BY and limit them with LIMIT.', 10, 10, 4, $json$[
  {"type":"code","language":"sql","filename":"order-by.sql","code":"SELECT name, price\nFROM products\nORDER BY price DESC, name\nLIMIT 5;"},
  {"type":"paragraph","text":"`ORDER BY` sorts ascending by default; add `DESC` for descending. Later columns break ties. `LIMIT` returns only the first rows."}
]$json$),
-- Power BI › Getting Started -------------------------------------------------------
('getting-started-with-power-bi', 'the-power-bi-workflow', 'The Power BI Workflow',
 'Get data, transform, model, visualise, publish.', 10, 10, 1, $json$[
  {"type":"list","style":"number","items":[
    "**Get data** from files, databases and online services",
    "**Transform** it in Power Query",
    "**Model** relationships and write DAX measures",
    "**Visualise** with report pages and visuals",
    "**Publish & share** through the Power BI service"
  ]},
  {"type":"callout","variant":"hint","text":"Most report problems are really model problems. Time spent on a clean star schema pays off later."}
]$json$),
('getting-started-with-power-bi', 'loading-data-with-power-query', 'Loading Data with Power Query',
 'Clean and shape data before it reaches the model.', 15, 15, 2, $json$[
  {"type":"paragraph","text":"Power Query records every cleaning step (removing columns, changing types, splitting text) so the same steps run again on every refresh."},
  {"type":"code","language":"m","filename":"Advanced Editor","code":"let\n    Source = Csv.Document(File.Contents(\"sales.csv\")),\n    Promoted = Table.PromoteHeaders(Source),\n    Typed = Table.TransformColumnTypes(Promoted, {{\"amount\", type number}})\nin\n    Typed"}
]$json$),
-- Capstone ---------------------------------------------------------------------------
('capstone-project', 'capstone-overview', 'Capstone Overview',
 'What you will build and how it will be assessed.', 10, 10, 1, $json$[
  {"type":"paragraph","text":"In the capstone you will take a raw retail dataset through the full analysis process: clean it in Excel or Power Query, query it with SQL, build a Power BI dashboard and present three recommendations."},
  {"type":"list","style":"bullet","items":["A cleaned dataset","A set of documented SQL queries","A Power BI report","A short written summary of findings"]},
  {"type":"callout","variant":"success","text":"Your finished project is designed to be portfolio-ready."}
]$json$)
) as l(module_slug, slug, title, summary, minutes, xp, sort_order, content) on l.module_slug = m.slug
on conflict (module_id, slug) do nothing;

-- A draft lesson to demonstrate unpublished content (visible to admins only).
insert into public.lessons (module_id, slug, title, summary, sort_order, status, created_by, content)
select m.id, 'grouping-and-aggregation', 'Grouping and Aggregation', 'GROUP BY, COUNT, SUM and HAVING. Coming soon.', 5, 'draft', null,
       '[{"type":"paragraph","text":"Draft content."}]'::jsonb
from public.modules m where m.slug = 'sql-fundamentals'
on conflict (module_id, slug) do nothing;

-- -----------------------------------------------------------------------------
-- Assessment & exercise structure (graded in a later phase)
-- -----------------------------------------------------------------------------
insert into public.quizzes (lesson_id, title, description, pass_mark_percent, xp_reward, status, created_by)
select l.id, 'KPI check', 'Three quick questions on KPIs.', 70, 20, 'published', null
from public.lessons l where l.slug = 'understanding-kpis'
and not exists (select 1 from public.quizzes q where q.lesson_id = l.id);

with q as (
  select q.id from public.quizzes q join public.lessons l on l.id = q.lesson_id where l.slug = 'understanding-kpis' limit 1
), inserted as (
  insert into public.quiz_questions (quiz_id, question_type, prompt, options, points, sort_order)
  select q.id, v.qtype::public.question_type, v.prompt, v.options::jsonb, 1, v.ord
  from q cross join (values
    (1, 'single_choice', 'Which of these is the best KPI for an online shop''s checkout performance?',
        '[{"id":"a","text":"Number of products in the catalogue"},{"id":"b","text":"Conversion rate"},{"id":"c","text":"Number of employees"}]'),
    (2, 'true_false', 'A KPI should be calculated the same way every time it is reported.',
        '[{"id":"true","text":"True"},{"id":"false","text":"False"}]'),
    (3, 'single_choice', 'Average order value is calculated as…',
        '[{"id":"a","text":"orders ÷ revenue"},{"id":"b","text":"revenue ÷ orders"},{"id":"c","text":"revenue − orders"}]')
  ) as v(ord, qtype, prompt, options)
  where not exists (select 1 from public.quiz_questions qq where qq.quiz_id = q.id)
  returning id, sort_order
)
insert into public.quiz_question_keys (question_id, correct_answer, explanation)
select i.id, k.answer::jsonb, k.explanation
from inserted i join (values
  (1, '"b"',    'Conversion rate directly measures how many visits turn into orders.'),
  (2, '"true"', 'Consistency is what makes a KPI comparable over time.'),
  (3, '"b"',    'Divide total revenue by the number of orders.')
) as k(ord, answer, explanation) on k.ord = i.sort_order;

insert into public.exercises (lesson_id, title, exercise_type, instructions, starter_code, dataset, level, xp_reward, status, created_by)
select l.id, 'Customers in Amsterdam', 'sql',
       '[{"type":"paragraph","text":"List the names of all customers based in Amsterdam, sorted alphabetically."}]'::jsonb,
       E'SELECT name\nFROM customers\n', 'shop', 'beginner', 25, 'published', null
from public.lessons l where l.slug = 'filtering-data-with-where'
and not exists (select 1 from public.exercises e where e.lesson_id = l.id);

insert into public.exercise_solutions (exercise_id, solution)
select e.id, E'SELECT name\nFROM customers\nWHERE city = ''Amsterdam''\nORDER BY name;'
from public.exercises e where e.title = 'Customers in Amsterdam'
on conflict (exercise_id) do nothing;

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------
insert into public.projects (path_id, course_id, slug, title, summary, brief, level, estimated_hours, xp_reward, sort_order, status, created_by)
select p.id, c.id, 'retail-sales-analysis', 'Retail Sales Analysis',
       'Analyse a year of retail sales and recommend where the business should focus next.',
       '[{"type":"paragraph","text":"You have been given twelve months of transaction data from a growing online retailer."},{"type":"list","style":"bullet","items":["Clean and document the dataset","Answer the business questions with SQL","Build a one-page Power BI dashboard","Write three evidence-based recommendations"]}]'::jsonb,
       'advanced', 12, 250, 1, 'published', null
from public.learning_paths p
join public.courses c on c.path_id = p.id and c.slug = 'data-analyst-capstone'
where p.slug = 'data-analyst'
on conflict (path_id, slug) do nothing;

-- -----------------------------------------------------------------------------
-- Achievements
-- -----------------------------------------------------------------------------
insert into public.achievements (slug, title, description, icon, xp_reward, criteria, sort_order, status) values
  ('first-lesson',   'First Steps',        'Complete your first lesson.',            '🚀', 10,  '{"type":"lessons_completed","threshold":1}',  1, 'published'),
  ('five-lessons',   'Getting Into It',    'Complete five lessons.',                 '📘', 25,  '{"type":"lessons_completed","threshold":5}',  2, 'published'),
  ('first-course',   'Course Complete',    'Finish every lesson in a course.',       '🏁', 50,  '{"type":"courses_completed","threshold":1}',  3, 'published'),
  ('streak-3',       'On a Roll',          'Learn three days in a row.',             '🔥', 15,  '{"type":"streak_days","threshold":3}',        4, 'published'),
  ('streak-7',       'Week Warrior',       'Learn seven days in a row.',             '⚡', 50,  '{"type":"streak_days","threshold":7}',        5, 'published'),
  ('xp-250',         'Quarter Thousand',   'Earn 250 XP.',                           '⭐', 0,   '{"type":"xp_total","threshold":250}',         6, 'published')
on conflict (slug) do nothing;

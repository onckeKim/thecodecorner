/* The Code Corner – SQL Lab: sample database + write-your-own-query exercises.
   Each exercise is graded by running the learner's query and the solution on a fresh copy of
   the database and comparing the results (values only; column names are ignored).
   orderMatters: true means the row order must match too. */
window.TCC = window.TCC || {};

TCC.SQL_SEED = [
  "CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
  "INSERT INTO departments VALUES (1,'Finance'),(2,'Marketing'),(3,'IT'),(4,'Sales'),(5,'Legal');",

  "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER REFERENCES departments(id), manager_id INTEGER REFERENCES employees(id), salary INTEGER, hire_date TEXT);",
  "INSERT INTO employees VALUES" +
  "(1,'Ana Silva',3,NULL,98000,'2016-03-01'),(2,'Ben Okafor',3,1,72000,'2019-06-15')," +
  "(3,'Chloé Martin',3,1,68000,'2021-01-10'),(4,'Dev Patel',1,NULL,91000,'2015-09-20')," +
  "(5,'Eva Novak',1,4,61000,'2020-02-03'),(6,'Finn Larsen',2,NULL,83000,'2017-11-11')," +
  "(7,'Grace Kim',2,6,57000,'2022-04-18'),(8,'Hugo Rossi',4,NULL,88000,'2018-05-07')," +
  "(9,'Isla Brown',4,8,54000,'2023-01-09'),(10,'Jonas Weber',4,8,59000,'2021-08-23')," +
  "(11,'Kemi Adeyemi',3,1,75000,'2020-10-01'),(12,'Leo Dubois',4,8,54000,'2022-09-12');",

  "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT, email TEXT, signup_date TEXT);",
  "INSERT INTO customers VALUES" +
  "(1,'Northwind Cafe','Amsterdam','hello@northwind.example','2023-01-15')," +
  "(2,'Blue Fern Studio','Utrecht',NULL,'2023-02-02')," +
  "(3,'Atlas Books','Amsterdam','info@atlas.example','2023-03-20')," +
  "(4,'Harbor & Co','Rotterdam','team@harbor.example','2023-05-11')," +
  "(5,'Pixel Forge','Utrecht',NULL,'2023-06-30')," +
  "(6,'Maple Goods','Rotterdam','sales@maple.example','2023-08-08')," +
  "(7,'Quiet Owl','Eindhoven','owl@quiet.example','2024-01-04')," +
  "(8,'Red Kite Labs','Amsterdam','hi@redkite.example','2024-02-14');",

  "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, price REAL);",
  "INSERT INTO products VALUES" +
  "(1,'Laptop Stand','Accessories',39.0),(2,'USB-C Hub','Accessories',49.0)," +
  "(3,'Mechanical Keyboard','Peripherals',119.0),(4,'Wireless Mouse','Peripherals',29.0)," +
  "(5,'27\" Monitor','Displays',289.0),(6,'Webcam HD','Peripherals',69.0)," +
  "(7,'Desk Lamp','Accessories',35.0),(8,'Noise-cancelling Headphones','Audio',199.0);",

  "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), order_date TEXT, status TEXT);",
  "INSERT INTO orders VALUES" +
  "(1,1,'2024-01-05','shipped'),(2,1,'2024-02-11','shipped'),(3,2,'2024-02-20','shipped')," +
  "(4,3,'2024-03-02','cancelled'),(5,4,'2024-03-15','shipped'),(6,4,'2024-04-01','shipped')," +
  "(7,5,'2024-04-09','pending'),(8,6,'2024-04-22','shipped'),(9,1,'2024-05-03','shipped')," +
  "(10,3,'2024-05-19','shipped');",

  "CREATE TABLE order_items (order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id), quantity INTEGER, unit_price REAL);",
  "INSERT INTO order_items VALUES" +
  "(1,1,2,39.0),(1,4,2,29.0),(2,5,1,289.0),(3,3,1,119.0),(3,4,1,29.0),(4,2,3,49.0)," +
  "(5,5,2,289.0),(5,6,2,69.0),(6,7,4,35.0),(7,3,2,119.0),(8,2,1,49.0),(8,1,1,39.0)," +
  "(9,6,1,69.0),(10,3,1,119.0),(10,7,2,35.0);"
].join('\n');

TCC.SQL_EXERCISES = [
  { id: 'lab-01', level: 'easy', title: 'Customers in Amsterdam',
    prompt: 'List the <b>names</b> of all customers based in Amsterdam, sorted alphabetically.',
    starter: 'SELECT name\nFROM customers\n',
    solution: "SELECT name\nFROM customers\nWHERE city = 'Amsterdam'\nORDER BY name;",
    orderMatters: true,
    hint: "Filter with WHERE city = 'Amsterdam', then add ORDER BY name." },

  { id: 'lab-02', level: 'easy', title: 'Products under €50',
    prompt: 'Show the <b>name</b> and <b>price</b> of every product that costs less than 50, cheapest first.',
    starter: 'SELECT name, price\nFROM products\n',
    solution: 'SELECT name, price\nFROM products\nWHERE price < 50\nORDER BY price;',
    orderMatters: true,
    hint: 'WHERE price < 50, then ORDER BY price (ascending is the default).' },

  { id: 'lab-03', level: 'easy', title: 'Missing emails',
    prompt: 'Which customers have no email address? Return their <b>names</b>.',
    starter: 'SELECT name\nFROM customers\n',
    solution: 'SELECT name FROM customers WHERE email IS NULL;',
    hint: 'A missing value is NULL. Use IS NULL, not = NULL.' },

  { id: 'lab-04', level: 'easy', title: 'Orders per status',
    prompt: 'Count the orders for each <b>status</b>. Return two columns: the status and the number of orders.',
    starter: 'SELECT status, COUNT(*) AS orders\nFROM orders\n',
    solution: 'SELECT status, COUNT(*) AS orders FROM orders GROUP BY status;',
    hint: 'Add GROUP BY status so COUNT(*) is calculated once per status.' },

  { id: 'lab-05', level: 'medium', title: 'Headcount per department',
    prompt: 'For each department that has employees, return the <b>department name</b> and its <b>headcount</b>. Put the largest departments first and break ties alphabetically.',
    starter: 'SELECT d.name, COUNT(*) AS headcount\nFROM employees e\nJOIN departments d ON ...\n',
    solution: 'SELECT d.name, COUNT(*) AS headcount\nFROM employees e\nJOIN departments d ON d.id = e.department_id\nGROUP BY d.name\nORDER BY headcount DESC, d.name;',
    orderMatters: true,
    hint: 'Join on d.id = e.department_id, GROUP BY d.name, then ORDER BY headcount DESC, d.name.' },

  { id: 'lab-06', level: 'medium', title: 'Customers who never ordered',
    prompt: 'Find the <b>names</b> of customers who have never placed an order.',
    starter: 'SELECT c.name\nFROM customers c\n',
    solution: 'SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;',
    hint: 'A LEFT JOIN keeps customers with no match. Their order columns are NULL.' },

  { id: 'lab-07', level: 'medium', title: 'Products nobody bought',
    prompt: 'Which products have never appeared on any order? Return the product <b>name</b>.',
    starter: 'SELECT p.name\nFROM products p\n',
    solution: 'SELECT p.name FROM products p\nWHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);',
    hint: 'Try WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id), or a LEFT JOIN with IS NULL.' },

  { id: 'lab-08', level: 'medium', title: 'Well-paid departments',
    prompt: 'Return each <b>department name</b> and its <b>average salary</b>, but only for departments where the average is <b>above 70,000</b>.',
    starter: 'SELECT d.name, AVG(e.salary) AS avg_salary\nFROM employees e\nJOIN departments d ON d.id = e.department_id\n',
    solution: 'SELECT d.name, AVG(e.salary) AS avg_salary\nFROM employees e\nJOIN departments d ON d.id = e.department_id\nGROUP BY d.name\nHAVING AVG(e.salary) > 70000;',
    hint: 'Conditions on an aggregate go in HAVING, after GROUP BY.' },

  { id: 'lab-09', level: 'medium', title: 'Who reports to whom',
    prompt: 'List every employee who has a manager, with two columns: the <b>employee name</b> and the <b>manager name</b>. Sort by employee name.',
    starter: 'SELECT e.name AS employee, m.name AS manager\nFROM employees e\n',
    solution: 'SELECT e.name AS employee, m.name AS manager\nFROM employees e\nJOIN employees m ON m.id = e.manager_id\nORDER BY e.name;',
    orderMatters: true,
    hint: 'Join the employees table to itself: JOIN employees m ON m.id = e.manager_id.' },

  { id: 'lab-10', level: 'hard', title: 'Order totals',
    prompt: 'For <b>shipped</b> orders only, return the <b>order id</b> and its <b>total</b> (quantity × unit price, added up). Largest totals first.',
    starter: 'SELECT o.id, SUM(oi.quantity * oi.unit_price) AS total\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\n',
    solution: "SELECT o.id, SUM(oi.quantity * oi.unit_price) AS total\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.status = 'shipped'\nGROUP BY o.id\nORDER BY total DESC;",
    orderMatters: true,
    hint: "Filter with WHERE o.status = 'shipped' before grouping, GROUP BY o.id, then ORDER BY total DESC." },

  { id: 'lab-11', level: 'hard', title: 'Top 3 customers',
    prompt: 'Who are the three best customers by revenue from <b>shipped</b> orders? Return the <b>customer name</b> and <b>revenue</b>, highest first.',
    starter: 'SELECT c.name, SUM(oi.quantity * oi.unit_price) AS revenue\nFROM customers c\n',
    solution: "SELECT c.name, SUM(oi.quantity * oi.unit_price) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.status = 'shipped'\nGROUP BY c.id, c.name\nORDER BY revenue DESC\nLIMIT 3;",
    orderMatters: true,
    hint: 'Join customers → orders → order_items, filter on shipped orders, group by customer, then ORDER BY revenue DESC LIMIT 3.' },

  { id: 'lab-12', level: 'hard', title: 'Monthly revenue',
    prompt: 'Show revenue from <b>shipped</b> orders per month in 2024, as <b>month</b> (formatted <code class="inline">YYYY-MM</code>) and <b>revenue</b>, in date order.',
    starter: "SELECT strftime('%Y-%m', o.order_date) AS month,\n       SUM(oi.quantity * oi.unit_price) AS revenue\nFROM orders o\n",
    solution: "SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.status = 'shipped'\nGROUP BY month\nORDER BY month;",
    orderMatters: true,
    hint: "This database is SQLite, so use strftime('%Y-%m', order_date) to get the month. Then GROUP BY month and ORDER BY month." },

  { id: 'lab-13', level: 'hard', title: 'Salary rank per department',
    prompt: 'Rank employees by salary <b>within their department</b>, with ties sharing a rank and no gaps. Return <b>department name</b>, <b>employee name</b>, <b>salary</b> and <b>rank</b>, sorted by department, then rank, then employee name.',
    starter: 'SELECT d.name AS department, e.name, e.salary,\n       DENSE_RANK() OVER (...) AS rnk\nFROM employees e\nJOIN departments d ON d.id = e.department_id\n',
    solution: 'SELECT d.name AS department, e.name, e.salary,\n       DENSE_RANK() OVER (PARTITION BY d.id ORDER BY e.salary DESC) AS rnk\nFROM employees e\nJOIN departments d ON d.id = e.department_id\nORDER BY department, rnk, e.name;',
    orderMatters: true,
    hint: 'Use DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC), then ORDER BY department, rnk, e.name.' }
];

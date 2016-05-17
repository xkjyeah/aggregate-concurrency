# Agreggate Concurrency

We encountered a simple use case for transactions where we did not want a database transaction to take place if
it would result in the stock of an item falling below zero.

One solution would be to have a "stock_level" table: (using an imaginary SQL dialect)

```sql
BEGIN TRANSACTION;

IF (SELECT stock_level FROM items WHERE item_id = 10) < $qty THEN
  ROLLBACK
ELSE
  UPDATE items SET stock_level = stock_level - $qty WHERE item_id = 10;
  
  INSERT INTO purchases (item_id, qty) VALUES (10, $qty)

  COMMIT;
END IF
```

This is ugly. Why maintain a the `stock_level` when you could do a `SUM()` over changes to the inventory?

```sql
BEGIN TRANSACTION;

IF (SELECT SUM(stock_changes) FROM item_changes WHERE item_id = 10) < $qty THEN
  ROLLBACK
ELSE
  INSERT INTO item_changes (item_id, qty) VALUES (10, -$qty)

  COMMIT;
END IF
```

Unfortunately, the scripts in this repo shows that with PostgreSQL 9.3, the above doesn't work concurrently with
other transactions, even if the other transactions don't affect the same item. (`no_concurrency.js`)

Instead, you'd want something like (`attempt1.js`):

```sql
BEGIN TRANSACTION;

INSERT INTO item_changes (item_id, qty) VALUES (10, -$qty)

IF (SELECT SUM(stock_changes) FROM item_changes WHERE item_id = 10) < 0 THEN
  ROLLBACK
ELSE
  COMMIT;
END IF
```

Why? I don't know. 

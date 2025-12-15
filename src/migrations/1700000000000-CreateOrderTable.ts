import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOrderTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'orderType',
            type: 'enum',
            enum: ['market', 'limit', 'sniper'],
            default: "'market'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'routing', 'building', 'submitted', 'confirmed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'tokenIn',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'tokenOut',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'amountIn',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'slippage',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 1.0,
          },
          {
            name: 'selectedDex',
            type: 'enum',
            enum: ['raydium', 'meteora'],
            isNullable: true,
          },
          {
            name: 'executedPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'amountOut',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'txHash',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'executedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDER_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_ORDER_CREATED_AT',
        columnNames: ['createdAt'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('orders');
  }
}
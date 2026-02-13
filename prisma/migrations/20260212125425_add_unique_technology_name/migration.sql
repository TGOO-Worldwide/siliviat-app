/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Technology` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Technology_name_key` ON `Technology`(`name`);

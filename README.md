# Блог

## Запуск

Нужны Node.js 22+ и npm.

```bash
npm install
npm run dev
```

Откройте [http://localhost:4321](http://localhost:4321). Сборка:

```bash
npm run build
npm run preview
```

## Как добавить статью

1. Создайте каркас:

   ```bash
   npm run new -- "Название статьи"
   ```

   Или положите файл сами: `src/content/posts/my-post.md`.

2. Картинки — в `public/images/posts/my-post/`. В Markdown пишите только имя файла:

   ```markdown
   ![Подпись под рисунком](diagram.png)
   ```

3. Формулы:

   ```markdown
   Строчная: $a^2 + b^2 = c^2$

   Выносная:

   $$
   e^{i\pi} + 1 = 0
   $$
   ```

4. Поля в начале файла:

   | Поле    | Обязательно | Смысл                                      |
   | ------- | ----------- | ------------------------------------------ |
   | title   | да          | Заголовок                                  |
   | date    | да          | Дата в ленте (`YYYY-MM-DD`)                |
   | excerpt | нет         | Описание для карточки и поиска             |
   | cover   | нет         | Обложка: имя файла в папке картинок поста  |
   | draft   | нет         | `true` — не публиковать                    |

Название, слоган и ссылки в подвале — в `src/site.ts`.

## Публикация на GitHub Pages

Workflow в `.github/workflows/deploy.yml` собирает сайт и выкладывает Pages. В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.

Для репозитория-проекта адрес будет `https://<user>.github.io/Blog/`. Если репозиторий называется `<user>.github.io`, в workflow поставьте `BASE: /`.

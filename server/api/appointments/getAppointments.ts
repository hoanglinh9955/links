export default defineEventHandler(async (event) => {
    try {
        // const query = getQuery(event)
        const results = event.context.cloudflare.env.DB.prepare(
        'SELECT * FROM `appointments`'
      ).all()
         //run return success: true or false and meta
      return results;
    } catch (e: any) {
      console.error({
        message: e.message
      });
    }
  })
  
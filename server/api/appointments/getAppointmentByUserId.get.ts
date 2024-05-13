export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event)
        const results = event.context.cloudflare.env.DB.prepare(
        'SELECT * FROM `appointments` WHERE doctor_id = ? '
      ).bind(query.user_id).all()
         //run return success: true or false and meta
      return results;
    } catch (e: any) {
      console.error({
        message: e.message
      });
    }
  })
  
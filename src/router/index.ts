import {createRouter, createWebHashHistory} from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import HomeView from '@/views/HomeView.vue'
import CategoryView from '@/views/CategoryView.vue'
import ToolView from '@/views/ToolView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'category/:categoryId',
          name: 'category',
          component: CategoryView,
        },
        {
          path: 'tool/:toolId',
          name: 'tool',
          component: ToolView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router